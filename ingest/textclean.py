"""Standard descriptions carry LaTeX. Strip it for display and for TTS --
otherwise the app reads "dollar backslash frac" aloud to an 8-year-old.
"""
import re

BS = chr(92)  # written this way so the source survives shell heredocs

_FRAC = re.compile(BS + BS + r'frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}')
_CMD = re.compile(BS + BS + r'[a-zA-Z]+\s?')
_EXAMPLE = re.compile(r'\*For example[^*]*\*', re.I)

_SYMS = [
    ("times", "×"), ("div", "÷"), ("cdot", "·"),
    ("leq", "≤"), ("geq", "≥"), ("neq", "≠"),
    ("pm", "±"),
]


def clean(s: str, drop_examples: bool = False) -> str:
    """LaTeX -> plain text safe for a K-5 UI and for speechSynthesis."""
    if not s:
        return ""
    for _ in range(3):  # nested: \frac{(n \times a)}{(n \times b)}
        s, n = _FRAC.subn(r"\1/\2", s)
        if not n:
            break
    for name, rep in _SYMS:
        s = s.replace(BS + name, rep)
    s = s.replace(BS + "%", "%")
    if drop_examples:
        s = _EXAMPLE.sub("", s)
    s = _CMD.sub("", s)          # any remaining \command
    s = s.replace("$", "")
    s = re.sub(r"[{}]", "", s)
    s = re.sub(r"\s+([,.;:])", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


if __name__ == "__main__":
    B = BS
    cases = [
        ("Understand a fraction $" + B + "frac{1}{b}$ as the quantity",
         "Understand a fraction 1/b as the quantity"),
        ("interpret $5 " + B + "times 7$ as the total",
         "interpret 5 × 7 as the total"),
        ("a fraction $" + B + "frac{(n " + B + "times a)}{(n " + B + "times b)}$ by",
         "a fraction (n × a)/(n × b) by"),
        ("Compare $" + B + "frac{2}{3}$ and $" + B + "frac{3}{4}$.",
         "Compare 2/3 and 3/4."),
        ("Solve problems. *For example, describe a context.*",
         "Solve problems."),
    ]
    ok = True
    for i, (src, want) in enumerate(cases):
        got = clean(src, drop_examples=(i == 4))
        if got != want:
            ok = False
            print("FAIL got  %r" % got)
            print("     want %r" % want)
        else:
            print("ok   %r" % got)
    print("\nall passed" if ok else "\nFAILURES")
