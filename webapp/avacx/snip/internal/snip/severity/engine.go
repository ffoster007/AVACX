package severity

// PriorityLevel enumerates operational urgency buckets.
type PriorityLevel string

const (
	PriorityP0 PriorityLevel = "P0"
	PriorityP1 PriorityLevel = "P1"
	PriorityP2 PriorityLevel = "P2"
	PriorityP3 PriorityLevel = "P3"
	PriorityP4 PriorityLevel = "P4"
)

// Score encapsulates the computed severity metadata for a finding.
type Score struct {
	Vector           Vector
	CVSS             float64
	Exploitability   float64
	BusinessImpact   float64
	AssetCriticality float64
	RiskScore        float64
	Priority         PriorityLevel
}

// ScoreInput provides the parameters required to compute a score.
type ScoreInput struct {
	Vector           Vector
	Exploitability   float64
	BusinessImpact   float64
	AssetCriticality float64
}

// Engine turns CVSS vectors into actionable risk scores.
type Engine struct {
	defaultBusiness float64
	defaultAsset    float64
}

// NewEngine constructs a severity engine with safe fallbacks.
func NewEngine(defaultBusiness, defaultAsset float64) *Engine {
	if defaultBusiness <= 0 {
		defaultBusiness = 1
	}
	if defaultAsset <= 0 {
		defaultAsset = 1
	}
	return &Engine{defaultBusiness: defaultBusiness, defaultAsset: defaultAsset}
}

// Compute derives the final severity score applying business context multipliers.
func (e *Engine) Compute(input ScoreInput) Score {
	business := input.BusinessImpact
	if business <= 0 {
		business = e.defaultBusiness
	}
	asset := input.AssetCriticality
	if asset <= 0 {
		asset = e.defaultAsset
	}
	exploitability := input.Exploitability
	if exploitability <= 0 {
		exploitability = 1
	}
	cvss := input.Vector.BaseScore()
	risk := (cvss * exploitability) * business * asset
	priority := selectPriority(risk)
	return Score{
		Vector:           input.Vector,
		CVSS:             cvss,
		Exploitability:   exploitability,
		BusinessImpact:   business,
		AssetCriticality: asset,
		RiskScore:        risk,
		Priority:         priority,
	}
}

func selectPriority(risk float64) PriorityLevel {
	switch {
	case risk >= 9:
		return PriorityP0
	case risk >= 7:
		return PriorityP1
	case risk >= 4:
		return PriorityP2
	case risk > 0:
		return PriorityP3
	default:
		return PriorityP4
	}
}
