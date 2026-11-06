# Windows: separate Telco and Energy tasks

Use one updated checkout with two Task Scheduler tasks. These scripts do not register or enable tasks automatically. The API/dashboard are deployed separately; this repository contains the robot and extractors only.

Examples assume `C:\Robots\robot_point_prod`. Replace that path with your actual installation folder.

## Update and check the robot

1. Back up your working installation. Preserve all `.env` files and each extractor's `.browser-profile` folder when copying the new code.
2. Install Node.js 22+ and Google Chrome. From the project root, run `npm ci`.
3. Keep the existing API key and source credentials in `robot\.env`. Confirm `ROBOT_API_URL=https://point-prod.nrjcallcenter.com/api`, configure `CHROME_PATH` for Windows, and include the Grafana credentials. Keep the Grafana password quoted if it contains `#`.
4. Check the Node executable path in `run-activity.cmd`; its default is `C:\Program Files\nodejs\node.exe`.
5. Use the same Windows account and VPN as your working robot. Test both launchers manually, one after the other, before enabling their schedules.

The Energy job expects activity `conquest-energy` and team `ncc-energy-conquest` in the API; Telco expects activity `telco` and team `ncc-box-conquest`. Those production ingestion groups have already been configured. For a different API installation, its administrator must configure them before ingestion.

The optional `CHROME_HEADLESS=true` runs Chrome without a visible window. Omit it to keep the configured browser mode. First verify source sign-in and VPN access under the account and browser mode used by the task.

## Task Scheduler

Open `taskschd.msc` and choose **Create Task**. Create these two tasks:

| Setting | Telco | Energy |
| --- | --- | --- |
| Name | Point Prod - Telco | Point Prod - Energy |
| Program/script | `C:\Windows\System32\cmd.exe` | `C:\Windows\System32\cmd.exe` |
| Arguments | `/d /c ""C:\Robots\robot_point_prod\deploy\windows\run-telco.cmd""` | `/d /c ""C:\Robots\robot_point_prod\deploy\windows\run-energy.cmd""` |
| Start in | `C:\Robots\robot_point_prod\deploy\windows` | Same |
| Daily start | 10:00 | 10:30 |
| Repeat every | 1 hour | 1 hour |
| For a duration of | 10 hours | 10 hours |
| Expected runs | 10:00, 11:00 ... 20:00 | 10:30, 11:30 ... 20:30 |

Times above are Tunis time (UTC+1). Task Scheduler uses the Windows server's clock; adjust the triggers if its time zone differs. Leave **Stop all running tasks at end of repetition duration** unchecked so the final extraction can finish.

Under **General**, select the working robot's Windows account and initially **Run only when user is logged on**. Keep that account signed in and its VPN connected. Background execution requires a separate successful headless test under the chosen account.

Under **Settings**:

- Enable **Allow task to be run on demand**.
- Enable **Run task as soon as possible after a scheduled start is missed**.
- Select **Do not start a new instance** if that task is already running.
- Set the execution limit to **2 hours**, allowing for shared-lock waiting and source timeouts.
- Do not require the computer to be idle.

The shared robot lock makes different activity tasks wait for browser profiles (up to one hour). Do not add `--schedule`: Windows starts each run and the command exits when done. Replace or disable an old generic task before enabling these tasks; an unscoped robot command runs all configured activities.

The current production watchdog alerts after 90 minutes without a run during its watch hours. The hourly schedule above fits that monitoring. A two-hour schedule needs the API silence threshold adjusted first. The schedule in `robot/config/robot.json` is only used with `--schedule`, not by these Windows launchers.

## Verify each task

Right-click **Run**, wait for completion, then check the correct activity under **Extractions** in the dashboard and its local log:

```text
robot\logs\telco.log
robot\logs\conquest-energy.log
```

A completed successful launcher returns exit code 0. Check the dashboard source statuses as well: a partial extraction can still complete and return 0. New data appears in authorized live views; published views update after publication.

Direct commands from the robot folder are:

```bat
node --env-file=.env src/index.js --job telco
node --env-file=.env src/index.js --job conquest-energy
```
