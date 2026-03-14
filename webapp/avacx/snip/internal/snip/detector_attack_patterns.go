package snip

import (
	"strings"

	"avacx/internal/snip/analysis"
	"avacx/internal/snip/severity"
)

func attackPatternRules() []detectionRule {
	return []detectionRule{
		{
			id:          "ATTACK-INPUT-EVAL",
			title:       "Dynamic evaluation of user input",
			description: "Detected runtime evaluation of request parameters, a common entry point for injection payloads.",
			category:    CategoryAttackPattern,
			subCategory: "Input-based attack vector",
			tags:        []string{"eval", "input"},
			references:  []string{"https://owasp.org/www-community/attacks/Code_Injection"},
			matcher: func(line analysis.LineInfo, res analysis.Result) (bool, string) {
				lower := strings.ToLower(line.Trimmed)
				if strings.Contains(lower, "eval(") && (strings.Contains(lower, "req.") || strings.Contains(lower, "request.") || strings.Contains(lower, "$_get") || strings.Contains(lower, "ctx.query")) {
					return true, line.Trimmed
				}
				return false, ""
			},
			exploitability: 0.95,
			businessImpact: 1.2,
			vector: severity.Vector{
				AttackVector:       severity.AttackVectorNetwork,
				AttackComplexity:   severity.AttackComplexityLow,
				PrivilegesRequired: severity.PrivilegesNone,
				UserInteraction:    severity.UserInteractionNone,
				Scope:              severity.ScopeChanged,
				Confidentiality:    severity.ImpactHigh,
				Integrity:          severity.ImpactHigh,
				Availability:       severity.ImpactLow,
			},
		},
		{
			id:          "ATTACK-ENCODING-BYPASS",
			title:       "Multiple decoding steps detected",
			description: "Multiple decoding operations on the same input can indicate attempts to bypass filters.",
			category:    CategoryAttackPattern,
			subCategory: "Encoding bypass technique",
			tags:        []string{"encoding", "bypass"},
			references:  []string{"https://owasp.org/www-community/Double_Encoding"},
			matcher: func(line analysis.LineInfo, res analysis.Result) (bool, string) {
				lower := strings.ToLower(line.Trimmed)
				if strings.Contains(lower, "decodeuri") && strings.Count(lower, "decode") > 1 {
					return true, line.Trimmed
				}
				if strings.Contains(lower, "urllib.parse.unquote") && strings.Count(lower, "unquote") > 1 {
					return true, line.Trimmed
				}
				return false, ""
			},
			exploitability: 0.7,
			businessImpact: 1.0,
			vector: severity.Vector{
				AttackVector:       severity.AttackVectorNetwork,
				AttackComplexity:   severity.AttackComplexityLow,
				PrivilegesRequired: severity.PrivilegesNone,
				UserInteraction:    severity.UserInteractionNone,
				Scope:              severity.ScopeUnchanged,
				Confidentiality:    severity.ImpactHigh,
				Integrity:          severity.ImpactLow,
				Availability:       severity.ImpactLow,
			},
		},
		{
			id:          "ATTACK-AUTH-BRUTEFORCE",
			title:       "Credential brute force loop",
			description: "Looping over credential dictionaries without throttling hints at brute force attack tooling.",
			category:    CategoryAttackPattern,
			subCategory: "Authentication attack vector",
			tags:        []string{"bruteforce", "credential"},
			references:  []string{"https://owasp.org/www-community/attacks/Brute_force_attack"},
			matcher: func(line analysis.LineInfo, res analysis.Result) (bool, string) {
				lower := strings.ToLower(line.Trimmed)
				if strings.Contains(lower, "for") && (strings.Contains(lower, "passwords") || strings.Contains(lower, "credential") || strings.Contains(lower, "wordlist")) {
					return true, line.Trimmed
				}
				return false, ""
			},
			exploitability: 0.8,
			businessImpact: 1.1,
			vector: severity.Vector{
				AttackVector:       severity.AttackVectorNetwork,
				AttackComplexity:   severity.AttackComplexityLow,
				PrivilegesRequired: severity.PrivilegesNone,
				UserInteraction:    severity.UserInteractionNone,
				Scope:              severity.ScopeUnchanged,
				Confidentiality:    severity.ImpactHigh,
				Integrity:          severity.ImpactLow,
				Availability:       severity.ImpactLow,
			},
		},
		{
			id:          "ATTACK-TOKEN-MANIPULATION",
			title:       "Token verification disabled",
			description: "Token validation is disabled which enables session hijacking and privilege escalation.",
			category:    CategoryAttackPattern,
			subCategory: "Authentication token manipulation",
			tags:        []string{"token", "jwt"},
			references:  []string{"https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/"},
			matcher: func(line analysis.LineInfo, res analysis.Result) (bool, string) {
				lower := strings.ToLower(line.Trimmed)
				if strings.Contains(lower, "jwt") && strings.Contains(lower, "verify=false") {
					return true, line.Trimmed
				}
				if strings.Contains(lower, "validate") && strings.Contains(lower, "false") && strings.Contains(lower, "token") {
					return true, line.Trimmed
				}
				return false, ""
			},
			exploitability: 0.85,
			businessImpact: 1.3,
			vector: severity.Vector{
				AttackVector:       severity.AttackVectorNetwork,
				AttackComplexity:   severity.AttackComplexityLow,
				PrivilegesRequired: severity.PrivilegesNone,
				UserInteraction:    severity.UserInteractionNone,
				Scope:              severity.ScopeChanged,
				Confidentiality:    severity.ImpactHigh,
				Integrity:          severity.ImpactHigh,
				Availability:       severity.ImpactLow,
			},
		},
		{
			id:          "ATTACK-CHAIN-ENTRYPOINT",
			title:       "Unprotected entry point identified",
			description: "HTTP handler lacks authentication or authorization checks, enlarging the attack surface.",
			category:    CategoryAttackPattern,
			subCategory: "Attack chain entry point",
			tags:        []string{"entrypoint", "authorization"},
			references:  []string{"https://owasp.org/Top10/A01_2021-Broken_Access_Control/"},
			matcher: func(line analysis.LineInfo, res analysis.Result) (bool, string) {
				lower := strings.ToLower(line.Trimmed)
				if (strings.Contains(lower, "router.get") || strings.Contains(lower, "app.get") || strings.Contains(lower, "http.handle")) && !strings.Contains(lower, "auth") {
					return true, line.Trimmed
				}
				return false, ""
			},
			exploitability: 0.75,
			businessImpact: 1.2,
			vector: severity.Vector{
				AttackVector:       severity.AttackVectorNetwork,
				AttackComplexity:   severity.AttackComplexityLow,
				PrivilegesRequired: severity.PrivilegesNone,
				UserInteraction:    severity.UserInteractionNone,
				Scope:              severity.ScopeChanged,
				Confidentiality:    severity.ImpactHigh,
				Integrity:          severity.ImpactLow,
				Availability:       severity.ImpactLow,
			},
		},
	}
}
