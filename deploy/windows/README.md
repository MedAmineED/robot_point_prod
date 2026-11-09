# Separate Windows robot tasks

Prepared locally; nothing here registers or changes a Windows task automatically.

After the API/web release and notification migration are explicitly approved, register Energy with `npm --prefix api run activity:register -- conquest-energy` on the API host. It only creates the Energy activity if absent; it does not create teams, seed users or overwrite Telco. Before enabling its Windows task, confirm its ingestion team exists and that the Energy job's `team` slug in `robot/config/robot.json` matches. Do not run registration against production before approval.

Production setup on 6 November 2026: the user explicitly approved the single `Conquest Energy` team with slug `ncc-energy-conquest`. Its first manual run, #61, succeeded and created 27 Energy agents automatically. The configured job already matches that slug. This run used the development workspace; the Windows robot installation and scheduled tasks were not changed.

On the Windows robot, install this version with `npm ci` and preserve `robot\.env`, extractor `.env` files and all `.browser-profile` directories. Configure `CHROME_PATH` for Windows in `robot\.env`, alongside source credentials and the existing API settings. `run-activity.cmd` assumes Node is at `C:\Program Files\nodejs\node.exe`; edit that one path if needed.

**Folders moved (once, when updating to this version).** The extractors now live under `extractors\`: `sf_extraction` → `extractors\salesforce`, `diabolocom_extraction` → `extractors\diabolocom`, `grafana_extraction` → `extractors\grafana` (`sheet_insertion` is gone, `bridge` is now `tools\bridge`). Before the first run, move each old folder's `.env` and `.browser-profile\` into the matching `extractors\<name>\`, then delete the old folders; the saved browser sessions are kept that way, so no new sign-in or verification code is needed. `robot\config\robot.json` already points at the new paths and the robot refuses to start if a `workspace` folder is missing.

## Launchers

`run-activity.cmd <job>` runs one job of `robot\config\robot.json` (any `activity` name; the robot rejects an unknown one) and logs to `robot\logs\<job>.log`. `run-telco.cmd` and `run-energy.cmd` are one-line wrappers around it. A new activity only needs a new one-line wrapper (`call "%~dp0run-activity.cmd" <job>`) or a task whose arguments call `run-activity.cmd <job>` directly, plus its job in `robot.json`.

The optional `CHROME_HEADLESS=true` setting runs Chrome without a visible window; `false` explicitly requests a visible window. Omit it to retain the existing Windows browser mode. Test sign-in/VPN access in the chosen mode before changing the task's logon setting.

## Task Scheduler

Use two independent tasks. Assuming the repository is `C:\Robots\sales_automation`:

| Setting | Telco | Energy |
| --- | --- | --- |
| Name | Point Prod - Telco | Point Prod - Energy |
| Program | `C:\Windows\System32\cmd.exe` | `C:\Windows\System32\cmd.exe` |
| Arguments | `/d /c ""C:\Robots\sales_automation\deploy\windows\run-telco.cmd""` | `/d /c ""C:\Robots\sales_automation\deploy\windows\run-energy.cmd""` |
| Start in | `C:\Robots\sales_automation\deploy\windows` | Same |

- Add the daily triggers appropriate for each activity, using the Windows server's time zone. For the current two-hour rhythm, an example is Telco 10:00/12:00/14:00/16:00/18:00/20:00 and Energy 11:00/13:00/15:00/17:00/19:00/21:00. Confirm the API robot-watch hours and silence threshold match your actual schedules before activation (the current watchdog assumes hourly runs).
- Do not add `--schedule`: Task Scheduler starts each run, and each command exits when finished.
- Use the same account/session/VPN as the working Telco task. With the existing visible Chrome configuration, select Run only when user is logged on.
- Choose Do not start a new instance for each task. The robot also uses a shared lock with a heartbeat so different activity tasks wait rather than open the same Chrome profile simultaneously (maximum wait one hour).
- Replace any old unspecific task action with the Telco launcher before enabling Energy. A robot command without `--job` runs all configured jobs.
- Local logs: `robot\logs\telco.log` and `robot\logs\conquest-energy.log`. The dashboard Extractions page records activity-specific API run history.
- Select Run manually for each task once, verify its log and the correctly scoped dashboard history, then enable its triggers. No task or release is activated by this change.

Direct equivalents from the robot folder:

```bat
node --env-file=.env src/index.js --job telco
node --env-file=.env src/index.js --job conquest-energy
```
