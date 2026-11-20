"""Check likely prose-language mistakes in added lines of explicitly owned paths."""
import re
import subprocess
import sys
from pathlib import Path


def git(*args):
    return subprocess.check_output(["git", *args], text=True)


def required_language(path):
    if path in {"RUNBOOK.md", "docs/STATUS.md"}:
        return "Turkish"
    if path.startswith(("docs/reviews/team/", "docs/handoff/")) and path.endswith(".md"):
        return "English"
    return None


ENGLISH = set("the this that with from when will must should then each before after".split())
TURKISH = set("bir bu için ile olarak sonra önce varsa kadar gereken değil ve".split())


def added_prose(lines):
    fenced = False
    for line in lines:
        if line.lstrip().startswith("```"):
            fenced = not fenced
        elif not fenced:
            yield re.sub(r"`[^`]*`|https?://\S+", "", line)


def main():
    try:
        base = git("merge-base", "HEAD", "origin/main").strip()
    except subprocess.CalledProcessError:
        base = "HEAD"
    tracked = set(git("diff", "--name-only", "--diff-filter=AM", "-z", base).split("\0"))
    untracked = set(git("ls-files", "--others", "--exclude-standard", "-z").split("\0"))
    problems = []
    for path in sorted(tracked | untracked):
        expected = required_language(path)
        if expected is None or not Path(path).is_file():
            continue
        if path in untracked:
            lines = Path(path).read_text().splitlines()
        else:
            diff = git("diff", "--no-ext-diff", "--unified=0", base, "--", path)
            lines = [line[1:] for line in diff.splitlines() if line.startswith("+") and not line.startswith("+++")]
        words = re.findall(r"[^\W\d_]+", " ".join(added_prose(lines)).lower())
        english = sum(word in ENGLISH for word in words)
        turkish = sum(word in TURKISH for word in words)
        wanted, other = (english, turkish) if expected == "English" else (turkish, english)
        if other >= 8 and other > wanted * 3:
            problems.append(f"{path}: added prose appears to use the wrong language. Expected {expected}.")
    if problems:
        print("\n".join(problems), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
