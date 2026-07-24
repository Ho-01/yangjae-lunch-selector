# ADR 0003: Persist synchronized lunch-room spins

- Status: Accepted
- Date: 2026-07-24

## Context

Each room participant must see the same winner and a comparable animation even
when messages arrive at different times or a client reconnects.

## Decision

Persist the winner, start time, and duration as shared room state. Clients derive
animation progress from that state rather than selecting or timing independently.

## Consequences

The host remains the authority for starting a spin, reconnecting clients can
recover the result, and UI code must tolerate receiving an already-started spin.
