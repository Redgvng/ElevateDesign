# QA Reviewer Playbook

Use after implementation tasks and before closing a phase.

## Review Order

1. Confirm requested behavior exists.
2. Run or inspect relevant tests.
3. Check failure states and error messages.
4. Check UI screenshots when frontend changed.
5. Verify docs and plan exit criteria.

## Output Format

Lead with findings:

- severity;
- file/line when code exists;
- reproduction or reason;
- required fix.

Then include:

- tests run;
- untested areas;
- release risk.

## Blockers

Block completion when:

- verification commands were not run and there is no clear reason;
- critical path has no test;
- generated UI can break host app;
- backend mutation can duplicate data on retry;
- plan exit criteria are not met.

