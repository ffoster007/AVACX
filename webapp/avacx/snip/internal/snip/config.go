package snip

// Config controls the runtime behaviour of the Snip scanner.
type Config struct {
	EnabledLanguages map[Language]bool
	MaxFindings      int
	BusinessImpact   float64
	AssetCriticality float64
}

// DefaultConfig seeds a configuration tuned for balanced coverage.
func DefaultConfig() Config {
	return Config{
		EnabledLanguages: map[Language]bool{},
		MaxFindings:      500,
		BusinessImpact:   1.0,
		AssetCriticality: 1.0,
	}
}

// Option mutates a configuration.
type Option func(*Config)

// WithLanguage enables scanning for a language.
func WithLanguage(lang Language) Option {
	return func(cfg *Config) {
		if cfg.EnabledLanguages == nil {
			cfg.EnabledLanguages = map[Language]bool{}
		}
		cfg.EnabledLanguages[lang] = true
	}
}

// WithMaxFindings caps the number of findings returned.
func WithMaxFindings(max int) Option {
	return func(cfg *Config) {
		if max > 0 {
			cfg.MaxFindings = max
		}
	}
}

// WithBusinessImpact adjusts downstream risk scoring.
func WithBusinessImpact(multiplier float64) Option {
	return func(cfg *Config) {
		if multiplier <= 0 {
			return
		}
		cfg.BusinessImpact = multiplier
	}
}

// WithAssetCriticality changes how critical the target system is treated.
func WithAssetCriticality(multiplier float64) Option {
	return func(cfg *Config) {
		if multiplier <= 0 {
			return
		}
		cfg.AssetCriticality = multiplier
	}
}
