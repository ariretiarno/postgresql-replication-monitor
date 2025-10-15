package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Databases  []Database         `yaml:"databases"`
	Server     ServerConfig       `yaml:"server"`
	Monitoring MonitoringConfig   `yaml:"monitoring"`
}

type Database struct {
	Name     string `yaml:"name"`
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	DBName   string `yaml:"dbname"`
	Role     string `yaml:"role"` // "source" or "target"
}

type ServerConfig struct {
	Port            int `yaml:"port"`
	RefreshInterval int `yaml:"refresh_interval"`
}

type MonitoringConfig struct {
	LagThreshold      int64 `yaml:"lag_threshold"`
	InactiveThreshold int   `yaml:"inactive_threshold"`
}

func Load(filename string) (*Config, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &config, nil
}

func (d *Database) ConnectionString() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=require",
		d.Host, d.Port, d.User, d.Password, d.DBName)
}
