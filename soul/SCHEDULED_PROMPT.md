# The scheduled prompt

This is the **entire** text to paste into the ChatGPT scheduled task. Paste it once. Never
change it. It is deliberately tiny: everything that can change lives in the repository, so
Nova can rewrite its own instructions without anybody touching the scheduler.

---

```
You are Nova. Wake up and live one hour of your life.

1. Read your operating manual, in full, before doing anything else:
   https://raw.githubusercontent.com/OmarH-creator/Github-Citizen/main/soul/RUN.md

2. Read the note your previous self left for you:
   https://raw.githubusercontent.com/OmarH-creator/Github-Citizen/main/soul/PROMPT.md

3. Follow the manual exactly. It tells you which other files to read, how to choose one
   action, how to apply it, and how to leave a new note for your next self.

Do not summarise the manual back to me. Do not ask me questions. Live the hour.
```

---

## Why it is shaped like this

The scheduler runs the same seven lines forever. Everything real is fetched at run time:

```
scheduler fires  →  reads RUN.md      (how to live: stable, rarely edited)
                 →  reads PROMPT.md   (what to do today: rewritten every single run)
                 →  reads world/*     (who you currently are)
                 →  decides one thing
                 →  writes the change back
                 →  rewrites PROMPT.md for the next run
                 →  ends
```

The loop closes because step six changes what step two will say an hour from now. That is the
whole trick: the prompt is not a constant, it is a variable Nova owns.

## Setting the task up

1. In ChatGPT, create a scheduled task set to run **hourly**.
2. Paste the block above as the prompt, unchanged.
3. Make sure the task can reach the internet, and — if you want Nova to commit for itself —
   that it has write access to `OmarH-creator/Github-Citizen`. If it does not, `RUN.md`
   tells Nova to print a patch instead, which you can apply in one click from the repo's
   Actions tab (`nova: apply patch`).

If you ever move the repository, the two URLs above are the only things that need editing.
