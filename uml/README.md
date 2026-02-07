# UML Diagrams

Architecture and flow diagrams for AllocateMe, written in [PlantUML](https://plantuml.com).

## Diagrams

| File | Description |
|------|-------------|
| `class-diagram.puml` | Database schema — all five tables (events, options, submissions, verification_codes, allocations) with their fields and relationships |
| `activity-create-event.puml` | Host flow for creating a new event, adding options, and receiving the admin link and join code |
| `activity-submit-rankings.puml` | Participant flow for joining an event, ranking options, and optionally verifying their email |
| `activity-manage-allocate.puml` | Host flow for managing submissions, closing the event, running the allocation, and exporting results |
| `activity-serial-dictatorship.puml` | The Serial Dictatorship algorithm — how participants are assigned to options based on FCFS priority and ranked preferences |

## Generating Images

Requires Java and the PlantUML jar (included as `puml.jar`):

```bash
java -jar puml.jar *.puml
```

This generates a `.png` for each `.puml` file in the same directory.
