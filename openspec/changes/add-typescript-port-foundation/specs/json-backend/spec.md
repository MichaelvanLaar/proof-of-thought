## ADDED Requirements

### Requirement: JSON DSL Format Translation

The system SHALL translate natural language questions and context into a custom JSON domain-specific language compatible with Z3 API.

#### Scenario: Generate JSON DSL for logical statement
- **WHEN** user provides a logical question with context
- **THEN** the system generates a valid JSON structure representing the logical formula

#### Scenario: Handle nested logical expressions
- **WHEN** the question involves complex nested logic (AND, OR, NOT, IMPLIES)
- **THEN** the JSON DSL correctly represents the nested structure with appropriate operators

#### Scenario: Support quantified formulas
- **WHEN** the question requires universal or existential quantifiers
- **THEN** the JSON DSL includes quantifier nodes with bound variables and bodies

### Requirement: Z3 API Direct Invocation

The system SHALL execute JSON DSL formulas using Z3 solver's programmatic API (Python API via Node.js bridge or Z3 JavaScript bindings).

#### Scenario: Execute JSON DSL via Z3 API
- **WHEN** a JSON DSL formula is ready for verification
- **THEN** the system translates JSON to Z3 API calls and executes them

#### Scenario: Leverage Z3 API features
- **WHEN** executing formulas
- **THEN** the system utilizes Z3 API capabilities like solver push/pop, assertions, and model queries

#### Scenario: Handle API execution errors
- **WHEN** Z3 API calls fail or raise exceptions
- **THEN** the system captures the error and provides diagnostic information

### Requirement: JSON DSL Schema Validation

The system SHALL validate JSON DSL structure against a defined schema before execution.

#### Scenario: Validate JSON DSL schema
- **WHEN** a JSON DSL formula is generated
- **THEN** the system validates it against the DSL schema specification

#### Scenario: Provide schema validation errors
- **WHEN** JSON DSL schema validation fails
- **THEN** the system returns specific error messages indicating which schema rules were violated

### Requirement: JSON Backend Type System

The system SHALL support a type system in JSON DSL for sorts, functions, and predicates.

#### Scenario: Define custom sorts in JSON
- **WHEN** the problem requires custom data types
- **THEN** the JSON DSL includes sort definitions that translate to Z3 sorts

#### Scenario: Define functions and predicates
- **WHEN** the problem involves custom functions or predicates
- **THEN** the JSON DSL includes function declarations with signatures

### Requirement: JSON DSL Extensibility

The system SHALL provide an extensible JSON DSL format that can accommodate new logical constructs.

#### Scenario: Add custom operators
- **WHEN** new logical operators are needed
- **THEN** the JSON DSL format supports adding operator definitions without breaking existing formulas

#### Scenario: Support domain-specific extensions
- **WHEN** specific reasoning domains require specialized constructs
- **THEN** the JSON DSL can be extended with domain-specific operators and types

### Requirement: JSON Backend Performance

The system SHALL optimize JSON DSL translation and execution for performance compared to SMT2 backend.

#### Scenario: Minimize API call overhead
- **WHEN** executing JSON DSL formulas
- **THEN** the system batches Z3 API calls efficiently to reduce overhead

#### Scenario: Reuse solver contexts
- **WHEN** processing multiple related queries
- **THEN** the system reuses Z3 solver contexts where appropriate for performance
