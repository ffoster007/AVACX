package snip

import (
	"regexp"
	"strings"

	"avacx/internal/snip/analysis"
	"avacx/internal/snip/severity"
)

func maliciousCodeRules() []detectionRule {
	return []detectionRule{
		{
			id:             "MALICIOUS-BACKDOOR-ADMIN",
			title:          "Hidden administrative endpoint",
			description:    "Discovered an unadvertised admin endpoint guarded by a static token, indicating a potential backdoor.",
			category:       CategoryMaliciousCode,
			subCategory:    "Backdoor detection",
			tags:           []string{"backdoor", "admin"},
			pattern:        regexp.MustCompile(`(?i)(router|app|server)\.(get|post)\s*\(['"].*(admin|secret)[^'"\n]*['"]`),
			exploitability: 0.9,
			businessImpact: 1.4,
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
			id:          "MALICIOUS-OBFUSCATED-EVAL",
			title:       "Obfuscated eval execution",
			description: "Obfuscated payload decoded then executed, a common characteristic of malware dropper scripts.",
			category:    CategoryMaliciousCode,
			subCategory: "Malware pattern",
			tags:        []string{"eval", "obfuscation"},
			matcher: func(line analysis.LineInfo, res analysis.Result) (bool, string) {
				lower := strings.ToLower(line.Trimmed)
				if strings.Contains(lower, "eval(") && (strings.Contains(lower, "base64") || strings.Contains(lower, "decode")) {
					return true, line.Trimmed
				}
				return false, ""
			},
			exploitability: 0.95,
			businessImpact: 1.4,
			vector: severity.Vector{
				AttackVector:       severity.AttackVectorNetwork,
				AttackComplexity:   severity.AttackComplexityLow,
				PrivilegesRequired: severity.PrivilegesNone,
				UserInteraction:    severity.UserInteractionNone,
				Scope:              severity.ScopeChanged,
				Confidentiality:    severity.ImpactHigh,
				Integrity:          severity.ImpactHigh,
				Availability:       severity.ImpactHigh,
			},
		},
		{
			id:             "MALICIOUS-DATA-EXFIL",
			title:          "Potential data exfiltration endpoint",
			description:    "Detected code assembling large payloads to external hosts, consistent with data exfiltration.",
			category:       CategoryMaliciousCode,
			subCategory:    "Data exfiltration",
			tags:           []string{"exfiltration", "network"},
			pattern:        regexp.MustCompile(`(?i)(requests\.post|axios\.post|http\.Post)\s*\([^\n]*(\/upload|\/collect|\/report)`),
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
			id:             "MALICIOUS-DNS-TUNNEL",
			title:          "DNS tunneling pattern",
			description:    "Suspicious DNS queries with encoded payloads can indicate data exfiltration via DNS tunneling.",
			category:       CategoryMaliciousCode,
			subCategory:    "Data exfiltration",
			tags:           []string{"dns", "tunneling"},
			pattern:        regexp.MustCompile(`(?i)dns\.(query|resolve)\s*\([^\n]*base64`),
			exploitability: 0.7,
			businessImpact: 1.2,
			vector: severity.Vector{
				AttackVector:       severity.AttackVectorNetwork,
				AttackComplexity:   severity.AttackComplexityHigh,
				PrivilegesRequired: severity.PrivilegesNone,
				UserInteraction:    severity.UserInteractionNone,
				Scope:              severity.ScopeChanged,
				Confidentiality:    severity.ImpactHigh,
				Integrity:          severity.ImpactLow,
				Availability:       severity.ImpactLow,
			},
		},
		{
			id:             "MALICIOUS-CRYPTO-MINING",
			title:          "Cryptocurrency mining signature",
			description:    "Detected references to known cryptocurrency mining pools or libraries.",
			category:       CategoryMaliciousCode,
			subCategory:    "Cryptocurrency mining",
			tags:           []string{"mining", "cryptocurrency"},
			pattern:        regexp.MustCompile(`(?i)(stratum\+tcp)|(cryptonight)|(coinhive)`),
			exploitability: 0.6,
			businessImpact: 1.1,
			vector: severity.Vector{
				AttackVector:       severity.AttackVectorNetwork,
				AttackComplexity:   severity.AttackComplexityHigh,
				PrivilegesRequired: severity.PrivilegesLow,
				UserInteraction:    severity.UserInteractionNone,
				Scope:              severity.ScopeChanged,
				Confidentiality:    severity.ImpactLow,
				Integrity:          severity.ImpactLow,
				Availability:       severity.ImpactHigh,
			},
		},
	}
}
