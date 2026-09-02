"""LaTeX -> plain text, for a K-5 UI and for speechSynthesis.

Two sources feed this, with different dialects:

  Learning Commons  $\\frac{1}{b}$, $5 \\times 7$, "*For example ...*" tails
  Eedi              \\( .. \\) and \\[ .. \\] delimiters, \\mathrm{~cm} units,
                    \\bigstar / \\square placeholders, tabular environments

Placeholders matter: a stem reading "What should replace the star?" is nonsense
if \\bigstar is silently dropped, so those map to real glyphs rather than "".
"""
import re

BS = chr(92)  # written this way so the source survives shell heredocs
B2 = BS + BS

# --- symbols that carry meaning and must survive -------------------------
_SYMS = [
    ("bigstar", "★"), ("blacksquare", "■"), ("square", "□"),
    ("bigcirc", "○"), ("triangle", "△"), ("ldots", "…"),
    ("cdots", "…"), ("sqrt", "√"), ("degree", "°"),
    ("times", "×"), ("div", "÷"), ("cdot", "·"),
    ("leq", "≤"), ("geq", "≥"), ("neq", "≠"),
    ("pm", "±"), ("equiv", "≡"),
    ("Rightarrow", "⇒"), ("rightarrow", "→"),
    ("Leftarrow", "⇐"), ("leftarrow", "←"),
    ("infty", "∞"), ("pi", "π"),
]
# longest first so \cdots wins over \cdot, \blacksquare over \square
_SYMS.sort(key=lambda kv: -len(kv[0]))

# --- wrappers whose braces should collapse to their contents -------------
_WRAPPERS = ("mathrm", "mathbf", "mathit", "text", "textbf", "boldsymbol",
             "operatorname", "mbox")

_FRAC = re.compile(B2 + r"frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}")
_WRAP = re.compile(B2 + "(?:" + "|".join(_WRAPPERS) + r")\s*\{([^{}]*)\}")
_COLOR = re.compile(B2 + r"color\s*\{[^{}]*\}\s*\{([^{}]*)\}")
_DEG = re.compile(r"\^\s*\{?\s*" + B2 + r"circ\s*\}?")
_SUP = re.compile(r"\^\s*\{([^{}]*)\}")
_TABENV = re.compile(B2 + r"(?:begin|end)\s*\{[a-z*]+\}(?:\s*\{[^{}]*\})?", re.I)
_CMD = re.compile(B2 + r"[a-zA-Z]+\s?")
_EXAMPLE = re.compile(r"\*For example[^*]*\*", re.I)

_SUPMAP = {"0": "⁰", "1": "¹", "2": "²", "3": "³",
           "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷",
           "8": "⁸", "9": "⁹"}


def _sup(m):
    body = m.group(1).strip()
    if body and all(c in _SUPMAP for c in body):
        return "".join(_SUPMAP[c] for c in body)
    return "^" + body


def clean(s, drop_examples=False):
    """LaTeX -> plain text safe for a K-5 UI and for speechSynthesis."""
    if not s:
        return ""

    # math delimiters: \( \) \[ \] and $...$
    for d in ("(", ")", "[", "]"):
        s = s.replace(BS + d, " ")
    s = s.replace("$", " ")

    # tabular structure before generic command stripping
    s = _TABENV.sub(" ", s)
    s = s.replace(BS + "hline", " ")
    s = s.replace(B2, " ; ")          # LaTeX row break
    s = s.replace("&", " | ")

    s = _COLOR.sub(r"\1", s)
    for _ in range(3):                # nested \mathrm inside \frac etc.
        s, n1 = _WRAP.subn(r"\1", s)
        s, n2 = _FRAC.subn(r"\1/\2", s)
        if not (n1 or n2):
            break

    s = _DEG.sub("°", s)
    s = _SUP.sub(_sup, s)

    for name, rep in _SYMS:
        s = s.replace(BS + name, rep)
    s = s.replace(BS + "%", "%")
    s = s.replace(BS + "$", "$")
    for sp in (";", ",", ":", "!", " "):   # \; \, \: \! and escaped space
        s = s.replace(BS + sp, " ")
    s = s.replace("~", " ")            # LaTeX non-breaking space

    if drop_examples:
        s = _EXAMPLE.sub("", s)

    s = _CMD.sub("", s)                # any remaining \command
    s = re.sub(r"[{}]", "", s)
    s = re.sub(r"\s+([,.;:?!])", r"\1", s)
    s = re.sub(r"(\|\s*)+\|", "|", s)
    s = re.sub(r"^[\s;|]+|[\s;|]+$", "", s)
    return re.sub(r"\s+", " ", s).strip()


if __name__ == "__main__":
    B = BS
    cases = [
        # Learning Commons
        ("Understand a fraction $" + B + "frac{1}{b}$ as the quantity",
         "Understand a fraction 1/b as the quantity"),
        ("interpret $5 " + B + "times 7$ as the total",
         "interpret 5 × 7 as the total"),
        ("a fraction $" + B + "frac{(n " + B + "times a)}{(n " + B + "times b)}$ by",
         "a fraction (n × a)/(n × b) by"),
        ("Solve problems. *For example, describe a context.*", "Solve problems."),
        # Eedi
        (B + "( 3 " + B + "times(2+4)-5 " + B + ")", "3 ×(2+4)-5"),
        (B + "[450 " + B + "mathrm{~cm}=" + B + "] " + B + "[" + B + "square "
         + B + "mathrm{~m}" + B + "]", "450 cm= □ m"),
        ("Which diagram shows an angle of " + B + "( 325^{" + B + "circ} " + B + ") ?",
         "Which diagram shows an angle of 325°?"),
        (B + "( 24,15,8,3,0 " + B + "ldots " + B + ")", "24,15,8,3,0 …"),
        ("value covered by the " + B + "bigstar", "value covered by the ★"),
        (B + "( x^{2} " + B + ")", "x²"),
        ("1/5 " + B + ";" + B + "square" + B + "; 1/6", "1/5 □ 1/6"),
    ]
    ok = True
    for i, (src, want) in enumerate(cases):
        got = clean(src, drop_examples=(i == 3))
        if got != want:
            ok = False
            print("FAIL got  %r" % got)
            print("     want %r" % want)
        else:
            print("ok   %r" % got)
    print("\nall passed" if ok else "\nFAILURES")
