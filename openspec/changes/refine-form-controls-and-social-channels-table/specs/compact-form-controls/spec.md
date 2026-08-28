## ADDED Requirements

### Requirement: Form controls render at a compact, consistent size
The shared `Input`, `Select` trigger, and `Textarea` components SHALL render at a reduced height (36px) with proportionally reduced padding, applied once at the component level so every screen using them inherits the size automatically.

#### Scenario: A form using the shared Input renders compactly
- **WHEN** any screen renders the shared `Input` component
- **THEN** the rendered control is 36px tall, not the previous 44px/48px

#### Scenario: Sizing change requires no per-screen edits
- **WHEN** the base `Input`/`Select`/`Textarea` components are resized
- **THEN** no individual form screen needs its own size override to pick up the change

### Requirement: Compact controls remain touch-accessible
Despite the reduced size, every form control SHALL remain at least 36px in its smallest dimension, keeping tap targets above the WCAG 2.2 AA minimum target size.

#### Scenario: Control is tapped on a mobile viewport
- **WHEN** a creator taps a compact input or dropdown trigger on a phone-width screen
- **THEN** the tap lands reliably without needing to zoom or aim precisely
