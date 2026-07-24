# Product

The public product name is **식사가챠**.

## Purpose

The product helps one person or a group decide what to eat for lunch with minimal
discussion while keeping the outcome understandable and playful.

## Primary users

- A team choosing from a maintained menu list near its workplace.
- An individual choosing from restaurants near their current location.
- A group collecting and narrowing candidates together in a temporary lunch room.

## Core flows

1. **Team wheel** — use managed menus, daily exclusions, and weather weighting.
2. **Nearby wheel** — request location explicitly, load nearby restaurants explicitly,
   filter locally, then spin with equal candidate probability.
3. **Lunch room** — create or join a room, collect candidates, express preferences,
   mark readiness, and share one synchronized result.
4. **Result memory** — keep up to 10 recent results in the current browser and
   optionally reduce the probability of the three most recent menus.

## Product principles

- The fastest path to a decision stays visually dominant.
- Probability-changing behavior is explainable.
- External API calls are explicit and cost-aware.
- Location and group identity are collected only when required by the active flow.
- Errors preserve user input and offer a next action.
- Playfulness supports the decision; it does not obscure status or control.

## Success signals

- A new user can complete a decision without instructions.
- Most sessions reach a result without reloading or abandoning the flow.
- Location denial and network failure can be recovered from.
- Group members see the same candidates, readiness, and final result.
- Mobile users can complete every core flow at 320px width.
