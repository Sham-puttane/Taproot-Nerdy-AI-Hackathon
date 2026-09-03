/**
 * Is this skill something you UNDERSTAND, or something you DO?
 *
 * The Coherence Map states every standard as a verb phrase, and the verb
 * carries the answer. "Understand a fraction as a number on the number line"
 * is a concept; "Fluently add and subtract within 20" is a procedure.
 *
 * The distinction decides what to recommend. Procedural gaps close with
 * practice, which is exactly what this app is good at. Conceptual gaps
 * usually do not -- a child who does not believe the pieces have to be equal
 * will practise happily and stay wrong, because more repetitions of a
 * misunderstanding produce a faster misunderstanding. Those want a person.
 *
 * A product willing to say "this one is not mine to fix" is worth more than
 * one that claims everything.
 */
const CONCEPTUAL =
  /^\s*(understand|explain|interpret|recognize|recognise|describe|compare|know that|represent)\b/i

const PROCEDURAL =
  /^\s*(fluently|add|subtract|multiply|divide|solve|count|measure|write|use|apply|find|generate|order|estimate|convert|round|partition|compose|decompose|express|determine|relate|read)\b/i

export type SkillKind = 'conceptual' | 'procedural' | 'unclear'

export function skillKind(standardText: string): SkillKind {
  const t = (standardText ?? '').trim()
  if (CONCEPTUAL.test(t)) return 'conceptual'
  if (PROCEDURAL.test(t)) return 'procedural'
  return 'unclear'
}

export function recommendation(kind: SkillKind): {
  headline: string
  detail: string
  needsHuman: boolean
} {
  if (kind === 'conceptual') {
    return {
      headline: 'Book 30 minutes with a tutor',
      detail:
        'This one is conceptual. More practice tends to make a misunderstanding faster rather than fixing it, so it wants a person who can hear how she is thinking about it.',
      needsHuman: true,
    }
  }
  if (kind === 'procedural') {
    return {
      headline: 'Practice will close this',
      detail:
        'This is a procedure rather than an idea. Short, regular sessions on this one skill should be enough; there is no need to book anyone.',
      needsHuman: false,
    }
  }
  return {
    headline: 'Worth ten minutes with a tutor',
    detail:
      'Hard to tell from the standard alone whether this is a habit or a misunderstanding. A short conversation will settle which.',
    needsHuman: true,
  }
}
