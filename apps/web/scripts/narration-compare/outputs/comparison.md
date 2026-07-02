# Narration model comparison

Input: 145 events, 3 notes, app="My Abhyasika", lang=hi, gender=female, target 204s.

| model | id | latency | length | notes |
|---|---|---|---|---|
| gemini | gemini-2.5-pro | 20.1s | 274w / 1392c | dev 53% |
| deepseek | deepseek-v4-pro | 42.7s | 478w / 2625c | dev 46% |
| kimi | kimi-k2-0905-preview | — | — | **no key** |

Scripts: see `outputs/<model>.txt`. Identical prompt fed to all (see `outputs/_user-message.txt`).
