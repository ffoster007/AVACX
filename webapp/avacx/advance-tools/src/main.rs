// codescan.rs
// Defensive scanner to find potentially dangerous code patterns in a repo.
// Usage: cargo run -- -path /path/to/repo -json out.json

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;
use walkdir::{DirEntry, WalkDir};

#[derive(Debug, Serialize, Deserialize)]
struct Finding {
    file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    line: Option<usize>,
    pattern: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
    severity: String, // low, medium, high
    #[serde(skip_serializing_if = "Option::is_none")]
    language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    snippet: Option<String>,
    timestamp: String,
}

impl Finding {
    fn new(
        file: String,
        line: Option<usize>,
        pattern: String,
        detail: Option<String>,
        severity: String,
        language: Option<String>,
        snippet: Option<String>,
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
        }
    }
}

struct RegexRule {
    name: String,
    pattern: Regex,
    severity: String,
    note: String,
}

fn build_regex_rules() -> Vec<RegexRule> {
    vec![
        RegexRule {
            name: "download_and_execute".to_string(),
            pattern: Regex::new(r"(?i)(curl\s+.*\|.*sh\b|wget\s+.*\|\s*sh\b|powershell\s+-[A-Za-z]+\s+IEX|Invoke-Expression)").unwrap(),
            severity: "high".to_string(),
            note: "download-and-run commands".to_string(),
        },
        RegexRule {
            name: "reverse_shell_like".to_string(),
            pattern: Regex::new(r#"(?i)(/dev/tcp|nc\s+.*\s+-e|bash\s+-i\s+>&\s*/dev/tcp|python\s+-c\s+".*socket.*connect)"#).unwrap(),
            severity: "high".to_string(),
            note: "common reverse-shell patterns".to_string(),
        },
        RegexRule {
            name: "suspicious_exec".to_string(),
            pattern: Regex::new(r"(?i)\b(exec\(|system\(|popen\(|subprocess\.Popen|subprocess\.call|Runtime\.getRuntime\(\)\.exec|spawn\()").unwrap(),
            severity: "high".to_string(),
            note: "direct execution of commands".to_string(),
        },
        RegexRule {
            name: "suspicious_network".to_string(),
            pattern: Regex::new(r"(?i)\b(http\.get|http\.request|requests\.get|requests\.post|fetch\(|net\.connect|net\.dial)\b").unwrap(),
            severity: "medium".to_string(),
            note: "network calls to remote hosts".to_string(),
        },
        RegexRule {
            name: "base64_blob".to_string(),
            pattern: Regex::new(r"(?i)(?:[A-Za-z0-9+/]{40,}={0,2})").unwrap(),
            severity: "medium".to_string(),
            note: "long base64-like blobs (possible obfuscation)".to_string(),
        },
        RegexRule {
            name: "obfuscated_string_concat".to_string(),
            pattern: Regex::new(r"(?i)(chr\(|\\x[0-9a-fA-F]{2})").unwrap(),
            severity: "medium".to_string(),
            note: "string obfuscation indicators".to_string(),
        },
        RegexRule {
            name: "private_key_like".to_string(),
            pattern: Regex::new(r"-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----").unwrap(),
            severity: "high".to_string(),
            note: "embedded private key".to_string(),
        },
    ]
}

fn is_excluded_dir(entry: &DirEntry) -> bool {
    let name = entry.file_name().to_str().unwrap_or("");
    matches!(name, ".git" | "vendor" | "node_modules" | "dist" | "build")
}

fn scan_go_file(path: &Path) -> io::Result<Vec<Finding>> {
    let mut findings = Vec::new();
    let content = fs::read_to_string(path)?;
    let path_str = path.display().to_string();

    // Check for dangerous imports
    let dangerous_imports = vec![
        ("os/exec", "running external commands"),
        ("syscall", "syscall calls (exec may be here)"),
        ("net", "networking (net.Dial etc.)"),
        ("net/http", "http client/server"),
        ("database/sql", "db access (review queries)"),
        ("unsafe", "unsafe package used"),
        ("C", "cgo (calls C code)"),
    ];

    for (import, detail) in dangerous_imports {
        let pattern = format!(r#"import\s+("{}"|\(\s*\n[^)]*"{})"#, import, import);
        if let Ok(re) = Regex::new(&pattern) {
            if re.is_match(&content) {
                let line = find_line_of_match(&content, &re);
                findings.push(Finding::new(
                    path_str.clone(),
                    Some(line),
                    format!("import {}", import),
                    Some(detail.to_string()),
                    "medium".to_string(),
                    Some("go".to_string()),
                    None,
                ));
            }
        }
    }

    // Check for dangerous function calls
    let dangerous_calls = vec![
        (r"\bexec\.Command\b", "exec.Command", "spawns external process", "high"),
        (r"\bexec\.CommandContext\b", "exec.CommandContext", "spawns external process", "high"),
        (r"\bsyscall\.Exec\b", "syscall.Exec", "replaces process image", "high"),
        (r"\bnet\.Dial\b", "net.Dial", "network call", "medium"),
        (r"\bhttp\.Get\b", "http.Get", "network call", "medium"),
        (r"\bhttp\.Post\b", "http.Post", "network call", "medium"),
        (r"\bos\.Remove\b", "os.Remove", "filesystem operations", "medium"),
        (r"\bos\.RemoveAll\b", "os.RemoveAll", "filesystem operations", "medium"),
        (r"\bos\.Create\b", "os.Create", "filesystem operations", "medium"),
        (r"\bos\.OpenFile\b", "os.OpenFile", "filesystem operations", "medium"),
    ];

    for (pattern, name, detail, severity) in dangerous_calls {
        if let Ok(re) = Regex::new(pattern) {
            if re.is_match(&content) {
                let line = find_line_of_match(&content, &re);
                findings.push(Finding::new(
                    path_str.clone(),
                    Some(line),
                    name.to_string(),
                    Some(detail.to_string()),
                    severity.to_string(),
                    Some("go".to_string()),
                    Some(excerpt_line(&content, line)),
                ));
            }
        }
    }

    // Apply regex rules
    let rules = build_regex_rules();
    for rule in &rules {
        if rule.pattern.is_match(&content) {
            let line = find_line_of_match(&content, &rule.pattern);
            findings.push(Finding::new(
                path_str.clone(),
                Some(line),
                rule.name.clone(),
                Some(rule.note.clone()),
                rule.severity.clone(),
                Some("go".to_string()),
                Some(excerpt_line(&content, line)),
            ));
        }
    }

    Ok(findings)
}

fn scan_with_regex(path: &Path) -> io::Result<Vec<Finding>> {
    let mut findings = Vec::new();
    let content = fs::read_to_string(path)?;
    let path_str = path.display().to_string();
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    let lang = ext_to_lang(ext);

    let rules = build_regex_rules();
    for rule in &rules {
        if rule.pattern.is_match(&content) {
            let line = find_line_of_match(&content, &rule.pattern);
            findings.push(Finding::new(
                path_str.clone(),
                Some(line),
                rule.name.clone(),
                Some(rule.note.clone()),
                rule.severity.clone(),
                Some(lang.clone()),
                Some(excerpt_line(&content, line)),
            ));
        }
    }

    Ok(findings)
}

fn find_line_of_match(text: &str, re: &Regex) -> usize {
    if let Some(mat) = re.find(text) {
        let prefix = &text[..mat.start()];
        prefix.matches('\n').count() + 1
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
    if ln.len() > 250 {
        format!("{}...", &ln[..250])
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
        _ => ext.to_string(),
    }
}

fn main() -> io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    
    let mut path = ".".to_string();
    let mut json_output: Option<String> = None;

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
            "-json" => {
                if i + 1 < args.len() {
                    json_output = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    i += 1;
                }
            }
            _ => i += 1,
        }
    }

    let start = Instant::now();
    let mut findings = Vec::new();

    let other_exts = vec![".py", ".sh", ".js", ".ts", ".rb", ".php", ".pl", ".ps1", ".bash"];

    for entry in WalkDir::new(&path)
        .into_iter()
        .filter_entry(|e| !is_excluded_dir(e))
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
                                Err(e) => {
                                    eprintln!("error scanning go file {}: {}", path.display(), e);
                                }
                            }
                        } else if other_exts.contains(&ext_lower.as_str()) {
                            match scan_with_regex(path) {
                                Ok(f) => findings.extend(f),
                                Err(e) => {
                                    eprintln!("error scanning file {}: {}", path.display(), e);
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("walk error: {}", e);
            }
        }
    }

    // Print summary
    let duration = start.elapsed();
    println!(
        "Scan completed in {:?} — found {} potential issues",
        duration,
        findings.len()
    );

    for f in &findings {
        println!(
            "[{}] {}:{} — {} — {}",
            f.severity.to_uppercase(),
            f.file,
            f.line.unwrap_or(0),
            f.pattern,
            f.detail.as_ref().unwrap_or(&String::new())
        );
    }

    // Write JSON if requested
    if let Some(json_file) = json_output {
        let json = serde_json::to_string_pretty(&findings)?;
        fs::write(&json_file, json)?;
        println!("JSON saved to {}", json_file);
    }

    Ok(())
}