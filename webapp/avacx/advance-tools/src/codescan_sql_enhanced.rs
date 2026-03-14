// codescan_sql_enhanced.rs
// Enhanced Scanner for SQL vulnerabilities and bad practices
// Usage examples:
//   Scan directory:
//     cargo run -- -path /path/to/repo
//   Scan specific files:
//     cargo run -- -files "vuln.js,src/*.js"
//   Save JSON:
//     cargo run -- -files "vuln.js" -json findings.json

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Finding {
    file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    line: Option<usize>,
    pattern: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
    severity: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    snippet: Option<String>,
    timestamp: String,
    category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    recommendation: Option<String>,
}

impl Finding {
    fn new(
        file: String,
        line: Option<usize>,
        pattern: String,
        detail: Option<String>,
        severity: String,
        category: String,
        language: Option<String>,
        snippet: Option<String>,
        recommendation: Option<String>,
    ) -> Self {
        Self {
            file,
            line,
            pattern,
            detail,
            severity,
            language,
            snippet,
            timestamp: chrono::Local::now().to_rfc3339(),
            category,
            recommendation,
        }
    }
}

#[derive(Clone)]
struct CustomMatch {
    line: usize,
    snippet: String,
}

type CustomMatcher = fn(&str) -> Vec<CustomMatch>;

struct ScanRule {
    name: String,
    pattern: Option<Regex>,
    severity: String,
    category: String,
    note: String,
    recommendation: String,
    custom_matcher: Option<CustomMatcher>,
}

fn build_sql_rules() -> Vec<ScanRule> {
    vec![
        // === SQL INJECTION VULNERABILITIES ===
        ScanRule {
            name: "sql_injection_string_concat".to_string(),
            pattern: Some(Regex::new(r#"(?i)["'`]SELECT[\s\S]{0,200}["'`]\s*[+&]\s*\w+"#).unwrap()),
            severity: "critical".to_string(),
            category: "vulnerability".to_string(),
            note: "SQL injection via string concatenation".to_string(),
            recommendation: "Use parameterized queries or prepared statements".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "sql_injection_template_literal".to_string(),
            pattern: Some(Regex::new(r"(?i)`\s*SELECT[\s\S]{0,300}\$\{[^}]+\}`").unwrap()),
            severity: "critical".to_string(),
            category: "vulnerability".to_string(),
            note: "SQL injection via template literal interpolation".to_string(),
            recommendation: "Use parameterized queries (e.g., db.query with $1, $2 placeholders)".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "sql_injection_format_string".to_string(),
            pattern: Some(Regex::new(r"(?i)(SELECT|INSERT|UPDATE|DELETE).*(%s|%d|\.format\(|sprintf\(|String\.format)").unwrap()),
            severity: "critical".to_string(),
            category: "vulnerability".to_string(),
            note: "SQL injection via format string".to_string(),
            recommendation: "Use prepared statements with positional parameters".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "sql_injection_request_params".to_string(),
            pattern: Some(Regex::new(r"(?i)(SELECT|INSERT|UPDATE|DELETE).*[+&].*\b(req\.body|req\.query|req\.params|request\.GET|request\.POST|\$_GET|\$_POST|\$_REQUEST)\b").unwrap()),
            severity: "critical".to_string(),
            category: "vulnerability".to_string(),
            note: "SQL built directly from HTTP request inputs".to_string(),
            recommendation: "Use ORM or parameterized queries; validate and sanitize all inputs".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "sql_injection_python_format".to_string(),
            pattern: Some(Regex::new(r#"(?i)(cursor\.execute|db\.execute|session\.execute)\s*\(\s*f?["'].*\{.*\}.*["']"#).unwrap()),
            severity: "critical".to_string(),
            category: "vulnerability".to_string(),
            note: "Python SQL injection via f-string or .format()".to_string(),
            recommendation: "Use cursor.execute with parameter tuples: cursor.execute(sql, (param1, param2))".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "sql_injection_php_concatenation".to_string(),
            pattern: Some(Regex::new(r#"(?i)\$.*=.*["'](SELECT|INSERT|UPDATE|DELETE).*["'].*\.\s*\$"#).unwrap()),
            severity: "critical".to_string(),
            category: "vulnerability".to_string(),
            note: "PHP SQL injection via string concatenation".to_string(),
            recommendation: "Use PDO with prepared statements: $stmt->execute([$param])".to_string(),
            custom_matcher: None,
        },
        // === BAD PRACTICES - QUERY CONSTRUCTION ===
        ScanRule {
            name: "dynamic_table_name".to_string(),
            pattern: Some(Regex::new(r#"(?i)(SELECT|INSERT|UPDATE|DELETE)\s+.*FROM\s*["'`]?\s*[+&]\s*\w+"#).unwrap()),
            severity: "high".to_string(),
            category: "bad_practice".to_string(),
            note: "Dynamic table/column names in query".to_string(),
            recommendation: "Whitelist allowed table names; use identifier quoting if dynamic names needed".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "select_star".to_string(),
            pattern: Some(Regex::new(r"(?i)SELECT\s+\*\s+FROM").unwrap()),
            severity: "low".to_string(),
            category: "bad_practice".to_string(),
            note: "SELECT * usage - retrieves unnecessary data".to_string(),
            recommendation: "Explicitly specify required columns for better performance and clarity".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "missing_where_update_delete".to_string(),
            pattern: None,
            severity: "high".to_string(),
            category: "bad_practice".to_string(),
            note: "UPDATE/DELETE without WHERE clause".to_string(),
            recommendation: "Always include WHERE clause to prevent accidental mass operations".to_string(),
            custom_matcher: Some(check_missing_where),
        },
        ScanRule {
            name: "no_limit_clause".to_string(),
            pattern: None,
            severity: "low".to_string(),
            category: "bad_practice".to_string(),
            note: "SELECT without LIMIT - potential performance issue".to_string(),
            recommendation: "Add LIMIT clause for large result sets; implement pagination".to_string(),
            custom_matcher: Some(check_no_limit),
        },
        // === BAD PRACTICES - TRANSACTION MANAGEMENT ===
        ScanRule {
            name: "transaction_without_commit".to_string(),
            pattern: None,
            severity: "medium".to_string(),
            category: "bad_practice".to_string(),
            note: "Transaction started but no COMMIT/ROLLBACK found nearby".to_string(),
            recommendation: "Always close transactions with COMMIT or ROLLBACK in finally block".to_string(),
            custom_matcher: Some(check_transaction_commit),
        },
        ScanRule {
            name: "autocommit_disabled".to_string(),
            pattern: Some(Regex::new(r"(?i)SET\s+AUTOCOMMIT\s*=\s*0").unwrap()),
            severity: "low".to_string(),
            category: "bad_practice".to_string(),
            note: "AUTOCOMMIT disabled - ensure proper transaction management".to_string(),
            recommendation: "Re-enable AUTOCOMMIT after transaction or use explicit transaction blocks".to_string(),
            custom_matcher: None,
        },
        // === BAD PRACTICES - CONNECTION MANAGEMENT ===
        ScanRule {
            name: "connection_not_closed".to_string(),
            pattern: None,
            severity: "medium".to_string(),
            category: "bad_practice".to_string(),
            note: "Database connection opened but no close() found".to_string(),
            recommendation: "Use try-with-resources (Java) or defer (Go) or with statement (Python)".to_string(),
            custom_matcher: Some(check_connection_close),
        },
        ScanRule {
            name: "no_connection_pooling".to_string(),
            pattern: Some(Regex::new(r"(?i)new\s+(Connection|PDO|MySQLConnection)\s*\(").unwrap()),
            severity: "low".to_string(),
            category: "bad_practice".to_string(),
            note: "Direct connection creation - consider connection pooling".to_string(),
            recommendation: "Use connection pool for better performance (e.g., HikariCP, pg.Pool)".to_string(),
            custom_matcher: None,
        },
        // === BAD PRACTICES - ERROR HANDLING ===
        ScanRule {
            name: "sql_error_exposed".to_string(),
            pattern: Some(Regex::new(r"(?i)(console\.log|print|echo|response\.send)\s*\([^)]*\b(err|error|exception)\b[^)]*sql[^)]*\)").unwrap()),
            severity: "high".to_string(),
            category: "security_risk".to_string(),
            note: "SQL errors exposed to client".to_string(),
            recommendation: "Log errors server-side only; return generic error messages to client".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "no_error_handling".to_string(),
            pattern: None,
            severity: "medium".to_string(),
            category: "bad_practice".to_string(),
            note: "Database query without error handling".to_string(),
            recommendation: "Add try-catch or .catch() or error callback to handle failures".to_string(),
            custom_matcher: Some(check_error_handling),
        },
        // === SECURITY RISKS ===
        ScanRule {
            name: "hardcoded_credentials".to_string(),
            pattern: Some(Regex::new(r#"(?i)(password|passwd|pwd)\s*[:=]\s*["'][^"'\{\}]{3,}["']"#).unwrap()),
            severity: "critical".to_string(),
            category: "security_risk".to_string(),
            note: "Hardcoded database password".to_string(),
            recommendation: "Use environment variables or secure vault (e.g., AWS Secrets Manager)".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "password_in_plain_text".to_string(),
            pattern: Some(Regex::new(r#"(?i)INSERT\s+INTO.*\bpassword\b.*VALUES.*["'][\w!@#$%^&*()]{3,}["']"#).unwrap()),
            severity: "critical".to_string(),
            category: "security_risk".to_string(),
            note: "Plain text password in SQL INSERT".to_string(),
            recommendation: "Hash passwords with bcrypt, argon2, or scrypt before storage".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "logging_sensitive_data".to_string(),
            pattern: Some(Regex::new(r"(?i)(console\.log|print|echo|logger)\([^)]*(password|passwd|pwd|credit|ssn|token|secret)[^)]*\)").unwrap()),
            severity: "high".to_string(),
            category: "security_risk".to_string(),
            note: "Sensitive data logged (password/token/credit info)".to_string(),
            recommendation: "Redact sensitive data before logging or use structured logging".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "sql_in_client_code".to_string(),
            pattern: Some(Regex::new(r"(?i)<script[^>]*>[\s\S]*?(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?</script>").unwrap()),
            severity: "high".to_string(),
            category: "security_risk".to_string(),
            note: "SQL query in client-side JavaScript".to_string(),
            recommendation: "Move all SQL to server-side; expose only API endpoints".to_string(),
            custom_matcher: None,
        },
        // === BAD PRACTICES - INDEXING & PERFORMANCE ===
        ScanRule {
            name: "like_wildcard_prefix".to_string(),
            pattern: Some(Regex::new(r#"(?i)LIKE\s+["']%[^"']*["']"#).unwrap()),
            severity: "low".to_string(),
            category: "bad_practice".to_string(),
            note: "LIKE with leading wildcard prevents index usage".to_string(),
            recommendation: "Use full-text search or restructure query; avoid leading % wildcards".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "function_on_indexed_column".to_string(),
            pattern: Some(Regex::new(r"(?i)WHERE\s+(UPPER|LOWER|SUBSTR|DATE|YEAR|MONTH)\s*\(\s*\w+\s*\)").unwrap()),
            severity: "low".to_string(),
            category: "bad_practice".to_string(),
            note: "Function applied to column in WHERE - prevents index usage".to_string(),
            recommendation: "Use computed/indexed columns or apply function to literal value instead".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "or_in_where_clause".to_string(),
            pattern: Some(Regex::new(r"(?i)WHERE.*\sOR\s").unwrap()),
            severity: "low".to_string(),
            category: "bad_practice".to_string(),
            note: "OR in WHERE clause - may prevent index usage".to_string(),
            recommendation: "Consider using UNION or restructure query with IN clause if possible".to_string(),
            custom_matcher: None,
        },
        // === BAD PRACTICES - DATA INTEGRITY ===
        ScanRule {
            name: "null_comparison".to_string(),
            pattern: Some(Regex::new(r"(?i)(=|!=|<>)\s*NULL").unwrap()),
            severity: "medium".to_string(),
            category: "bad_practice".to_string(),
            note: "Incorrect NULL comparison (should use IS NULL / IS NOT NULL)".to_string(),
            recommendation: "Use IS NULL or IS NOT NULL for NULL comparisons".to_string(),
            custom_matcher: None,
        },
        // === GENERAL SECURITY PATTERNS ===
        ScanRule {
            name: "download_and_execute".to_string(),
            pattern: Some(Regex::new(r"(?i)(curl\s+.*\|.*sh\b|wget\s+.*\|\s*sh\b|powershell\s+-[A-Za-z]+\s+IEX|Invoke-Expression)").unwrap()),
            severity: "critical".to_string(),
            category: "vulnerability".to_string(),
            note: "Download-and-run command detected".to_string(),
            recommendation: "Avoid downloading and executing untrusted code".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "reverse_shell".to_string(),
            pattern: Some(Regex::new(r#"(?i)(/dev/tcp|nc\s+.*\s+-e|bash\s+-i\s+>&\s*/dev/tcp|python\s+-c\s+".*socket.*connect)"#).unwrap()),
            severity: "critical".to_string(),
            category: "vulnerability".to_string(),
            note: "Reverse shell pattern detected".to_string(),
            recommendation: "Remove malicious code immediately".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "suspicious_exec".to_string(),
            pattern: Some(Regex::new(r"(?i)\b(exec\(|system\(|popen\(|subprocess\.Popen|subprocess\.call|Runtime\.getRuntime\(\)\.exec|spawn\()").unwrap()),
            severity: "high".to_string(),
            category: "security_risk".to_string(),
            note: "Direct command execution function used".to_string(),
            recommendation: "Validate and sanitize inputs; use safer alternatives when possible".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "base64_obfuscation".to_string(),
            pattern: Some(Regex::new(r"(?i)(?:[A-Za-z0-9+/]{60,}={0,2})").unwrap()),
            severity: "medium".to_string(),
            category: "security_risk".to_string(),
            note: "Long base64 blob (possible obfuscation)".to_string(),
            recommendation: "Review decoded content for malicious code".to_string(),
            custom_matcher: None,
        },
        ScanRule {
            name: "private_key_embedded".to_string(),
            pattern: Some(Regex::new(r"-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----").unwrap()),
            severity: "critical".to_string(),
            category: "security_risk".to_string(),
            note: "Embedded private key detected".to_string(),
            recommendation: "Remove private key; use secure key management system".to_string(),
            custom_matcher: None,
        },
    ]
}

// Custom matcher functions
fn check_missing_where(text: &str) -> Vec<CustomMatch> {
    let re = Regex::new(r"(?i)(UPDATE|DELETE)\s+\w+\s+(SET|FROM)").unwrap();
    let mut results = Vec::new();

    for mat in re.find_iter(text) {
        let end = std::cmp::min(mat.end() + 500, text.len());
        let snippet = &text[mat.start()..end];

        if !snippet.to_uppercase().contains("WHERE") {
            let line = text[..mat.start()].matches('\n').count() + 1;
            results.push(CustomMatch {
                line,
                snippet: get_line_text(text, line),
            });
        }
    }
    results
}

fn check_no_limit(text: &str) -> Vec<CustomMatch> {
    let re = Regex::new(r"(?i)SELECT\s+.*\s+FROM\s+\w+").unwrap();
    let mut results = Vec::new();

    for mat in re.find_iter(text) {
        let end = std::cmp::min(mat.end() + 500, text.len());
        let snippet = &text[mat.start()..end];
        let upper = snippet.to_uppercase();

        if !upper.contains("LIMIT") && !Regex::new(r"TOP\s+\d").unwrap().is_match(&upper) {
            let line = text[..mat.start()].matches('\n').count() + 1;
            results.push(CustomMatch {
                line,
                snippet: get_line_text(text, line),
            });
        }
    }
    results
}

fn check_transaction_commit(text: &str) -> Vec<CustomMatch> {
    let re = Regex::new(r"(?i)(BEGIN|START)\s+(TRANSACTION|TRAN)\b").unwrap();
    let mut results = Vec::new();

    for mat in re.find_iter(text) {
        let end = std::cmp::min(mat.end() + 1000, text.len());
        let snippet = &text[mat.start()..end];
        let upper = snippet.to_uppercase();

        if !upper.contains("COMMIT") && !upper.contains("ROLLBACK") {
            let line = text[..mat.start()].matches('\n').count() + 1;
            results.push(CustomMatch {
                line,
                snippet: get_line_text(text, line),
            });
        }
    }
    results
}

fn check_connection_close(text: &str) -> Vec<CustomMatch> {
    let re = Regex::new(r"(?i)(createConnection|getConnection|connect)\s*\(").unwrap();
    let mut results = Vec::new();

    for mat in re.find_iter(text) {
        let end = std::cmp::min(mat.end() + 1000, text.len());
        let snippet = &text[mat.start()..end];

        if !snippet.contains(".close()") && !snippet.contains(".Close()") {
            let line = text[..mat.start()].matches('\n').count() + 1;
            results.push(CustomMatch {
                line,
                snippet: get_line_text(text, line),
            });
        }
    }
    results
}

fn check_error_handling(text: &str) -> Vec<CustomMatch> {
    let re = Regex::new(r"(?i)(execute|query|exec)\s*\([^)]+\)").unwrap();
    let mut results = Vec::new();

    for mat in re.find_iter(text) {
        let end = std::cmp::min(mat.end() + 200, text.len());
        let snippet = &text[mat.start()..end];
        let lower = snippet.to_lowercase();

        let has_error_handling = lower.contains(".catch")
            || lower.contains("try")
            || (lower.contains("if") && lower.contains("err"))
            || lower.contains("error");

        if !has_error_handling {
            let line = text[..mat.start()].matches('\n').count() + 1;
            results.push(CustomMatch {
                line,
                snippet: get_line_text(text, line),
            });
        }
    }
    results
}

fn get_line_text(text: &str, line: usize) -> String {
    let lines: Vec<&str> = text.lines().collect();
    if line == 0 || line > lines.len() {
        return String::new();
    }
    let ln = lines[line - 1].trim();
    if ln.len() > 200 {
        format!("{}...", &ln[..200])
    } else {
        ln.to_string()
    }
}

fn scan_text_with_rules(path: &str, text: &str, lang: &str) -> Vec<Finding> {
    let mut findings = Vec::new();
    let rules = build_sql_rules();

    for rule in &rules {
        // Pattern-based matching
        if let Some(ref pattern) = rule.pattern {
            if pattern.is_match(text) {
                let line = find_line_of_match(text, pattern);
                findings.push(Finding::new(
                    path.to_string(),
                    Some(line),
                    rule.name.clone(),
                    Some(rule.note.clone()),
                    rule.severity.clone(),
                    rule.category.clone(),
                    Some(lang.to_string()),
                    Some(excerpt_line(text, line)),
                    Some(rule.recommendation.clone()),
                ));
            }
        }

        // Custom matcher
        if let Some(matcher) = rule.custom_matcher {
            let matches = matcher(text);
            for m in matches {
                findings.push(Finding::new(
                    path.to_string(),
                    Some(m.line),
                    rule.name.clone(),
                    Some(rule.note.clone()),
                    rule.severity.clone(),
                    rule.category.clone(),
                    Some(lang.to_string()),
                    Some(m.snippet),
                    Some(rule.recommendation.clone()),
                ));
            }
        }
    }

    findings
}

fn scan_go_file(path: &Path) -> io::Result<Vec<Finding>> {
    let mut findings = Vec::new();
    let content = fs::read_to_string(path)?;
    let path_str = path.display().to_string();

    // Check dangerous imports
    let dangerous_imports = vec![
        ("database/sql", "database/sql imported - verify parameterized queries used"),
        ("unsafe", "unsafe package used"),
        ("C", "cgo (calls C code)"),
    ];

    for (import, detail) in dangerous_imports {
        let pattern_str = format!(r#"import\s+("{}"|\(\s*\n[^)]*"{})"#, import, import);
        if let Ok(re) = Regex::new(&pattern_str) {
            if re.is_match(&content) {
                let line = find_line_of_match(&content, &re);
                findings.push(Finding::new(
                    path_str.clone(),
                    Some(line),
                    format!("import {}", import),
                    Some(detail.to_string()),
                    "low".to_string(),
                    "bad_practice".to_string(),
                    Some("go".to_string()),
                    None,
                    Some("Ensure secure usage patterns".to_string()),
                ));
            }
        }
    }

    // Check for dangerous SQL patterns in Go
    let sql_patterns = vec![
        (r#"(Query|Exec|QueryRow)\([^)]*%s"#, "db query with format string", "critical"),
        (r#"(Query|Exec|QueryRow)\([^)]*\+"#, "SQL via concatenation", "critical"),
    ];

    for (pattern, detail, severity) in sql_patterns {
        if let Ok(re) = Regex::new(pattern) {
            if re.is_match(&content) {
                let line = find_line_of_match(&content, &re);
                findings.push(Finding::new(
                    path_str.clone(),
                    Some(line),
                    "sql_injection".to_string(),
                    Some(detail.to_string()),
                    severity.to_string(),
                    "vulnerability".to_string(),
                    Some("go".to_string()),
                    Some(excerpt_line(&content, line)),
                    Some("Use parameterized queries with ? or $1 placeholders".to_string()),
                ));
            }
        }
    }

    // Apply all SQL rules
    findings.extend(scan_text_with_rules(&path_str, &content, "go"));

    Ok(findings)
}

fn scan_with_regex(path: &Path) -> io::Result<Vec<Finding>> {
    let content = fs::read_to_string(path)?;
    let path_str = path.display().to_string();
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    let lang = ext_to_lang(ext);

    Ok(scan_text_with_rules(&path_str, &content, &lang))
}

fn find_line_of_match(text: &str, re: &Regex) -> usize {
    if let Some(mat) = re.find(text) {
        text[..mat.start()].matches('\n').count() + 1
    } else {
        0
    }
}

fn excerpt_line(text: &str, line: usize) -> String {
    if line == 0 {
        return String::new();
    }
    let lines: Vec<&str> = text.lines().collect();
    if line > lines.len() {
        return String::new();
    }
    let ln = lines[line - 1].trim();
    if ln.len() > 200 {
        format!("{}...", &ln[..200])
    } else {
        ln.to_string()
    }
}

fn ext_to_lang(ext: &str) -> String {
    match ext.to_lowercase().as_str() {
        "py" => "python".to_string(),
        "sh" | "bash" => "shell".to_string(),
        "js" => "javascript".to_string(),
        "ts" => "typescript".to_string(),
        "rb" => "ruby".to_string(),
        "php" => "php".to_string(),
        "ps1" => "powershell".to_string(),
        "pl" => "perl".to_string(),
        "sql" => "sql".to_string(),
        _ => ext.to_string(),
    }
}

fn print_summary(findings: &[Finding], duration: std::time::Duration) {
    let mut severity_counts: HashMap<String, usize> = HashMap::new();
    let mut category_counts: HashMap<String, usize> = HashMap::new();

    for f in findings {
        *severity_counts.entry(f.severity.clone()).or_insert(0) += 1;
        *category_counts.entry(f.category.clone()).or_insert(0) += 1;
    }

    println!("\n╔════════════════════════════════════════════════════╗");
    println!("║  SQL Security & Best Practice Scan Results         ║");
    println!("╚════════════════════════════════════════════════════╝\n");
    println!("Scan completed in {:?}", duration);
    println!("Total issues found: {}\n", findings.len());

    println!("By Severity:");
    for sev in &["critical", "high", "medium", "low"] {
        if let Some(count) = severity_counts.get(*sev) {
            println!("  {:<10}: {}", sev.to_uppercase(), count);
        }
    }

    println!("\nBy Category:");
    for (cat, count) in category_counts.iter() {
        println!("  {:<20}: {}", cat, count);
    }
    println!();
}

fn print_findings(findings: &[Finding]) {
    if findings.is_empty() {
        println!("✓ No issues found!");
        return;
    }

    let mut grouped: HashMap<String, Vec<&Finding>> = HashMap::new();
    for f in findings {
        grouped.entry(f.severity.clone()).or_insert_with(Vec::new).push(f);
    }

    for severity in &["critical", "high", "medium", "low"] {
        if let Some(items) = grouped.get(*severity) {
            if items.is_empty() {
                continue;
            }

            println!("\n━━━ {} SEVERITY ({}) ━━━", severity.to_uppercase(), items.len());
            for (i, f) in items.iter().enumerate() {
                let icon = match *severity {
                    "critical" => "🔴",
                    "high" => "🟠",
                    "medium" => "🟡",
                    _ => "🔵",
                };

                println!("\n{} [{}] {}:{}", icon, i + 1, f.file, f.line.unwrap_or(0));
                println!("   Pattern: {}", f.pattern);
                println!("   Category: {}", f.category);
                if let Some(ref detail) = f.detail {
                    println!("   Issue: {}", detail);
                }
                if let Some(ref snippet) = f.snippet {
                    if !snippet.is_empty() {
                        println!("   Code: {}", snippet);
                    }
                }
                if let Some(ref rec) = f.recommendation {
                    println!("   💡 Fix: {}", rec);
                }
            }
        }
    }
}

fn save_json(findings: &[Finding], path: &str) -> io::Result<()> {
    let json = serde_json::to_string_pretty(findings)?;
    fs::write(path, json)?;
    println!("\n✓ JSON report saved to {}", path);
    Ok(())
}

fn split_and_trim(s: &str, sep: char) -> Vec<String> {
    s.split(sep)
        .map(|p| p.trim().trim_matches(|c| c == '"' || c == '\'').to_string())
        .filter(|p| !p.is_empty())
        .collect()
}

fn scan_specific_files(files_str: &str) -> Vec<Finding> {
    let mut findings = Vec::new();
    let items = split_and_trim(files_str, ',');
    let mut unique_files = std::collections::HashSet::new();

    for item in items {
        let matches = match glob::glob(&item) {
            Ok(paths) => paths.filter_map(Result::ok).collect::<Vec<_>>(),
            Err(_) => vec![PathBuf::from(&item)],
        };

        for m in matches {
            if let Ok(info) = fs::metadata(&m) {
                if info.is_dir() {
                    eprintln!("skip directory: {} (use -path for directories)", m.display());
                    continue;
                }
                if let Ok(abs) = m.canonicalize() {
                    unique_files.insert(abs);
                }
            } else {
                eprintln!("skip {}: file not found", m.display());
            }
        }
    }

    for file in unique_files {
        match process_file(&file) {
            Ok(f) => findings.extend(f),
            Err(e) => eprintln!("error scanning {}: {}", file.display(), e),
        }
    }

    findings
}

fn scan_directory(path: &str) -> Vec<Finding> {
    let mut findings = Vec::new();
    let other_exts = vec![".py", ".sh", ".js", ".ts", ".rb", ".php", ".pl", ".ps1", ".bash", ".sql"];

    for entry in WalkDir::new(path)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_str().unwrap_or("");
            !matches!(name, ".git" | "vendor" | "node_modules" | "dist" | "build" | "__pycache__")
        })
    {
        match entry {
            Ok(entry) => {
                if entry.file_type().is_file() {
                    let path = entry.path();
                    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                        let ext_lower = format!(".{}", ext.to_lowercase());

                        if ext_lower == ".go" {
                            match scan_go_file(path) {
                                Ok(f) => findings.extend(f),
                                Err(e) => eprintln!("error scanning go file {}: {}", path.display(), e),
                            }
                        } else if other_exts.contains(&ext_lower.as_str()) {
                            match scan_with_regex(path) {
                                Ok(f) => findings.extend(f),
                                Err(e) => eprintln!("error scanning file {}: {}", path.display(), e),
                            }
                        }
                    }
                }
            }
            Err(e) => eprintln!("walk error: {}", e),
        }
    }

    findings
}

fn process_file(path: &Path) -> io::Result<Vec<Finding>> {
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    if ext.eq_ignore_ascii_case("go") {
        scan_go_file(path)
    } else {
        scan_with_regex(path)
    }
}

fn main() -> io::Result<()> {
    let args: Vec<String> = std::env::args().collect();

    let mut path = ".".to_string();
    let mut files: Option<String> = None;
    let mut json_output: Option<String> = None;
    let mut show_low = true;
    let mut category_filter: Option<String> = None;

    // Parse arguments
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "-path" => {
                if i + 1 < args.len() {
                    path = args[i + 1].clone();
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "-files" => {
                if i + 1 < args.len() {
                    files = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "-json" => {
                if i + 1 < args.len() {
                    json_output = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "-show-low" => {
                if i + 1 < args.len() {
                    show_low = args[i + 1].parse().unwrap_or(true);
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "-category" => {
                if i + 1 < args.len() {
                    category_filter = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    i += 1;
                }
            }
            _ => i += 1,
        }
    }

    let start = Instant::now();
    let mut findings = if let Some(files_str) = files {
        scan_specific_files(&files_str)
    } else {
        scan_directory(&path)
    };

    // Filter by category if specified
    if let Some(ref cat) = category_filter {
        findings.retain(|f| f.category.eq_ignore_ascii_case(cat));
    }

    // Filter by severity if needed
    if !show_low {
        findings.retain(|f| f.severity != "low");
    }

    let duration = start.elapsed();
    print_summary(&findings, duration);
    print_findings(&findings);

    if let Some(json_path) = json_output {
        save_json(&findings, &json_path)?;
    }

    Ok(())
}