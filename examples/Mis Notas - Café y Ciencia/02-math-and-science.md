---
title: Math and Science
date: 2026-11-02
tags: [math, science, katex]
---

# Math and Science

## Equations

Inline math: the famous relation is $E = mc^2$.

An escaped currency symbol is not a formula: the notebook costs \$5.

Display math: the Gaussian integral is

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

The quadratic formula is

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

## Aligned derivation

$$
\begin{aligned}
(a+b)^2 &= (a+b)(a+b) \\
        &= a^2 + 2ab + b^2
\end{aligned}
$$

## Units and chemistry

Water is $\mathrm{H_2O}$, and a speed of $3.0\times10^8\,\mathrm{m/s}$ is approximately the speed of light.

```python
from math import sqrt

def quadratic_roots(a: float, b: float, c: float) -> tuple[complex, complex]:
    discriminant = b * b - 4 * a * c
    root = sqrt(abs(discriminant))
    return ((-b + root) / (2 * a), (-b - root) / (2 * a))

print(quadratic_roots(1, -3, 2))
```

Return to [the Markdown basics](01-markdown-basics.md#markdown-reader-lab).
