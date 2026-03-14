package severity

import "math"

// AttackVector represents the CVSS attack vector metric.
type AttackVector string

const (
	AttackVectorNetwork  AttackVector = "N"
	AttackVectorAdjacent AttackVector = "A"
	AttackVectorLocal    AttackVector = "L"
	AttackVectorPhysical AttackVector = "P"
)

func (v AttackVector) weight() float64 {
	switch v {
	case AttackVectorNetwork:
		return 0.85
	case AttackVectorAdjacent:
		return 0.62
	case AttackVectorLocal:
		return 0.55
	case AttackVectorPhysical:
		return 0.2
	default:
		return 0.85
	}
}

// AttackComplexity expresses how predictable exploitation is.
type AttackComplexity string

const (
	AttackComplexityLow  AttackComplexity = "L"
	AttackComplexityHigh AttackComplexity = "H"
)

func (c AttackComplexity) weight() float64 {
	if c == AttackComplexityLow {
		return 0.77
	}
	return 0.44
}

// PrivilegesRequired indicates the privilege level needed to exploit.
type PrivilegesRequired string

const (
	PrivilegesNone PrivilegesRequired = "N"
	PrivilegesLow  PrivilegesRequired = "L"
	PrivilegesHigh PrivilegesRequired = "H"
)

func (p PrivilegesRequired) weight(scope Scope) float64 {
	switch p {
	case PrivilegesNone:
		return 0.85
	case PrivilegesLow:
		if scope == ScopeChanged {
			return 0.68
		}
		return 0.62
	case PrivilegesHigh:
		if scope == ScopeChanged {
			return 0.5
		}
		return 0.27
	default:
		return 0.85
	}
}

// UserInteraction specifies if the victim needs to be involved.
type UserInteraction string

const (
	UserInteractionNone     UserInteraction = "N"
	UserInteractionRequired UserInteraction = "R"
)

func (u UserInteraction) weight() float64 {
	if u == UserInteractionNone {
		return 0.85
	}
	return 0.62
}

// Scope declares whether exploitation impacts resources beyond the authorization scope.
type Scope string

const (
	ScopeUnchanged Scope = "U"
	ScopeChanged   Scope = "C"
)

// ImpactMetric quantifies the loss of confidentiality, integrity, or availability.
type ImpactMetric string

const (
	ImpactNone ImpactMetric = "N"
	ImpactLow  ImpactMetric = "L"
	ImpactHigh ImpactMetric = "H"
)

func (m ImpactMetric) weight() float64 {
	switch m {
	case ImpactNone:
		return 0.0
	case ImpactLow:
		return 0.22
	case ImpactHigh:
		return 0.56
	default:
		return 0.0
	}
}

// Vector captures the CVSS base metrics used across the engine.
type Vector struct {
	AttackVector       AttackVector
	AttackComplexity   AttackComplexity
	PrivilegesRequired PrivilegesRequired
	UserInteraction    UserInteraction
	Scope              Scope
	Confidentiality    ImpactMetric
	Integrity          ImpactMetric
	Availability       ImpactMetric
}

// BaseScore computes the CVSS v3.1 base score rounded to one decimal place.
func (v Vector) BaseScore() float64 {
	iscBase := 1 - ((1 - v.Confidentiality.weight()) * (1 - v.Integrity.weight()) * (1 - v.Availability.weight()))
	impact := 0.0
	if v.Scope == ScopeUnchanged {
		impact = 6.42 * iscBase
	} else {
		impact = 7.52*(iscBase-0.029) - 3.25*math.Pow(iscBase-0.02, 15)
	}
	if impact < 0 {
		impact = 0
	}
	if impact == 0 {
		return 0
	}
	exploitability := 8.22 * v.AttackVector.weight() * v.AttackComplexity.weight() * v.PrivilegesRequired.weight(v.Scope) * v.UserInteraction.weight()
	score := 0.0
	if v.Scope == ScopeUnchanged {
		score = impact + exploitability
	} else {
		score = 1.08 * (impact + exploitability)
	}
	return roundToNearestTenth(math.Min(score, 10))
}

func roundToNearestTenth(value float64) float64 {
	return math.Round(value*10) / 10
}
