import { Difficulty, QuestionItem } from './types';

function makeOptions(correct: string, distractors: [string, string, string], seed: number): { options: [string, string, string, string]; correctIndex: number } {
  const arr = [correct, distractors[0], distractors[1], distractors[2]];
  const correctIndex = seed % 4;
  const swapped = [...arr];
  const temp = swapped[0];
  swapped[0] = swapped[correctIndex];
  swapped[correctIndex] = temp;
  return {
    options: swapped as [string, string, string, string],
    correctIndex,
  };
}

function q(
  id: string,
  classLevel: number,
  moduleId: string,
  topic: string,
  difficulty: Difficulty,
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  hint: string,
  explanation: string,
  seed: number
): QuestionItem {
  const { options, correctIndex } = makeOptions(correct, distractors, seed);
  return {
    id,
    classLevel,
    subjectId: 'math',
    moduleId,
    topic,
    difficulty,
    prompt,
    options,
    correctIndex,
    hint,
    explanation,
  };
}

export function generateMathModuleQuestions(classLevel: number, moduleNumber: 1 | 2 | 3 | 4, moduleId: string, moduleTitle: string): QuestionItem[] {
  const items: QuestionItem[] = [];
  const diffs: Difficulty[] = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'];

  for (let i = 0; i < 9; i++) {
    const diff = diffs[i];
    const id = `${moduleId}-q${i + 1}`;
    const seed = classLevel * 31 + moduleNumber * 17 + i * 7;

    if (classLevel === 1) {
      if (moduleNumber === 1) {
        const a = 3 + i * 2 + (diff === 'hard' ? 12 : 0);
        const step = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 5;
        items.push(q(
          id, classLevel, moduleId, 'Number Sequencing', diff,
          `What number comes next in the counting pattern: ${a}, ${a + step}, ${a + step * 2}, ___?`,
          `${a + step * 3}`,
          [`${a + step * 3 + 1}`, `${a + step * 2 + 1}`, `${a + step * 3 - 1}`],
          `Find how much we add each time from ${a} to ${a + step}.`,
          `Each step increases by ${step}, so ${a + step * 2} + ${step} = ${a + step * 3}.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const a = 2 + i;
        const b = diff === 'easy' ? 3 : diff === 'medium' ? 5 : 8;
        items.push(q(
          id, classLevel, moduleId, 'Single & Two-Digit Addition', diff,
          `Aarav has ${a} marbles and finds ${b} more marbles. How many marbles does he have in total?`,
          `${a + b}`,
          [`${a + b + 1}`, `${a + b - 1}`, `${a + b + 2}`],
          `Start from ${a} and count forward ${b} steps.`,
          `Adding ${a} + ${b} gives ${a + b} marbles altogether.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const total = 9 + i + (diff === 'hard' ? 6 : 0);
        const take = 2 + (i % 5);
        items.push(q(
          id, classLevel, moduleId, 'Simple Subtraction', diff,
          `There are ${total} birds on a tree. ${take} birds fly away. How many birds remain?`,
          `${total - take}`,
          [`${total - take + 1}`, `${total - take - 1}`, `${total + take}`],
          `Subtract ${take} from ${total} by counting backward.`,
          `${total} - ${take} = ${total - take} birds remain on the tree.`,
          seed
        ));
      } else {
        const shapes = [
          { name: 'Triangle', sides: '3' },
          { name: 'Square', sides: '4' },
          { name: 'Rectangle', sides: '4' },
          { name: 'Circle', sides: '0' },
        ];
        const s = shapes[i % shapes.length];
        items.push(q(
          id, classLevel, moduleId, 'Basic Shapes & Sides', diff,
          diff === 'hard'
            ? `Which shape has ${s.sides === '0' ? 'no straight corners and is completely round' : `${s.sides} straight sides and ${s.sides} corners`}?`
            : `How many straight sides does a ${s.name.toLowerCase()} have?`,
          diff === 'hard' ? s.name : s.sides,
          diff === 'hard'
            ? shapes.filter((x) => x.name !== s.name).map((x) => x.name).slice(0, 3) as [string, string, string]
            : ['2', '5', '6'].map((v) => (v === s.sides ? '1' : v)) as [string, string, string],
          `Picture a ${s.name.toLowerCase()} and count each straight edge carefully.`,
          `A ${s.name} has ${s.sides} straight sides.`,
          seed
        ));
      }
    } else if (classLevel === 2) {
      if (moduleNumber === 1) {
        const tens = 2 + (i % 7);
        const ones = 1 + ((i * 3) % 8);
        const val = tens * 10 + ones;
        items.push(q(
          id, classLevel, moduleId, 'Place Value (Tens & Ones)', diff,
          diff === 'hard'
            ? `Which number is formed by ${tens} tens and ${ones} ones?`
            : `In the number ${val}, what is the value of the digit in the tens place?`,
          diff === 'hard' ? `${val}` : `${tens * 10}`,
          diff === 'hard' ? [`${ones * 10 + tens}`, `${tens + ones}`, `${val + 10}`] : [`${tens}`, `${ones * 10}`, `${ones}`],
          `Remember: 1 ten equals 10 ones.`,
          `${tens} tens = ${tens * 10}, plus ${ones} ones = ${val}.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const a = 14 + i * 3;
        const b = 12 + (i % 4) * 5;
        items.push(q(
          id, classLevel, moduleId, 'Two-Digit Addition', diff,
          `What is the sum of ${a} + ${b}?`,
          `${a + b}`,
          [`${a + b - 10}`, `${a + b + 1}`, `${a + b + 10}`],
          `Add the ones digits first, then add the tens digits.`,
          `${a} + ${b} = ${a + b}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const a = 45 + i * 4;
        const b = 16 + (i % 5) * 3;
        items.push(q(
          id, classLevel, moduleId, 'Two-Digit Subtraction', diff,
          `Subtract ${b} from ${a}. What is ${a} - ${b}?`,
          `${a - b}`,
          [`${a - b + 2}`, `${a - b - 2}`, `${a - b + 10}`],
          `Start with the ones column; regroup 1 ten if needed.`,
          `${a} - ${b} = ${a - b}.`,
          seed
        ));
      } else {
        const unit = diff === 'easy' ? 2 : diff === 'medium' ? 5 : 10;
        const count = 3 + (i % 6);
        items.push(q(
          id, classLevel, moduleId, 'Repeated Addition & Early Multiplication', diff,
          `If ${count} baskets each hold ${unit} apples, how many apples are there in all?`,
          `${count * unit}`,
          [`${count + unit}`, `${count * unit + unit}`, `${count * unit - 1}`],
          `Add ${unit} to itself ${count} times.`,
          `${count} × ${unit} = ${count * unit} apples.`,
          seed
        ));
      }
    } else if (classLevel === 3) {
      if (moduleNumber === 1) {
        const h = 1 + (i % 8);
        const t = (i * 2) % 9;
        const o = (i * 3 + 1) % 9;
        const num = h * 100 + t * 10 + o;
        items.push(q(
          id, classLevel, moduleId, 'Three-Digit Place Value', diff,
          `What is the expanded form of ${num}?`,
          `${h * 100} + ${t * 10} + ${o}`,
          [`${h * 100} + ${t} + ${o}`, `${h * 10} + ${t * 100} + ${o}`, `${h * 100} + ${o * 10} + ${t}`],
          `Break the number into hundreds, tens, and ones.`,
          `${num} = ${h} hundreds (${h * 100}) + ${t} tens (${t * 10}) + ${o} ones.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const a = 4 + (i % 6);
        const b = 3 + (i % 7);
        items.push(q(
          id, classLevel, moduleId, 'Multiplication Tables', diff,
          `Calculate ${a} × ${b}.`,
          `${a * b}`,
          [`${a * b + a}`, `${a * b - b}`, `${a + b}`],
          `Think of ${a} groups of ${b}.`,
          `${a} × ${b} = ${a * b}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const divisor = 3 + (i % 5);
        const quotient = 4 + (i % 7);
        const dividend = divisor * quotient;
        items.push(q(
          id, classLevel, moduleId, 'Equal Sharing & Division', diff,
          `${dividend} pencils are shared equally among ${divisor} students. How many pencils does each student get?`,
          `${quotient}`,
          [`${quotient + 1}`, `${quotient - 1}`, `${divisor + quotient}`],
          `Ask yourself: ${divisor} times what number equals ${dividend}?`,
          `${dividend} ÷ ${divisor} = ${quotient} pencils per student.`,
          seed
        ));
      } else {
        const totalParts = 4 + (i % 5);
        const shaded = 1 + (i % (totalParts - 1));
        items.push(q(
          id, classLevel, moduleId, 'Introduction to Fractions', diff,
          `A ribbon is cut into ${totalParts} equal parts, and ${shaded} parts are painted blue. What fraction is painted blue?`,
          `${shaded}/${totalParts}`,
          [`${totalParts}/${shaded}`, `${totalParts - shaded}/${totalParts}`, `${shaded}/${totalParts + 1}`],
          `The numerator is the painted parts; the denominator is the total equal parts.`,
          `Out of ${totalParts} equal parts, ${shaded} are painted, giving ${shaded}/${totalParts}.`,
          seed
        ));
      }
    } else if (classLevel === 4) {
      if (moduleNumber === 1) {
        const a = 1200 + i * 235;
        const b = 450 + i * 110;
        items.push(q(
          id, classLevel, moduleId, 'Large Numbers & Operations', diff,
          diff === 'hard'
            ? `A library had ${a} books and received ${b} new books. How many books are in the library now?`
            : `Compute ${a} + ${b}.`,
          `${a + b}`,
          [`${a + b - 100}`, `${a + b + 10}`, `${a - b}`],
          `Align thousands, hundreds, tens, and ones columns carefully.`,
          `${a} + ${b} = ${a + b}.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const base = 6 + i;
        const mult = 2 + (i % 4);
        const target = base * mult;
        items.push(q(
          id, classLevel, moduleId, 'Factors & Multiples', diff,
          `Which of the following is a factor of ${target}?`,
          `${base}`,
          [`${base + 4}`, `${target + 2}`, `${base + 5}`],
          `A factor divides ${target} completely with zero remainder.`,
          `${target} ÷ ${base} = ${mult} with remainder 0, so ${base} is a factor of ${target}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const l = 6 + i;
        const w = 4 + (i % 5);
        items.push(q(
          id, classLevel, moduleId, 'Perimeter of Rectangles', diff,
          `Find the perimeter of a rectangular garden with length ${l} m and breadth ${w} m.`,
          `${2 * (l + w)} m`,
          [`${l * w} m`, `${l + w} m`, `${2 * l + w} m`],
          `Perimeter of a rectangle = 2 × (length + breadth).`,
          `2 × (${l} + ${w}) = 2 × ${l + w} = ${2 * (l + w)} m.`,
          seed
        ));
      } else {
        const mins = (1 + (i % 3)) * 60 + 15 * (i % 4);
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        items.push(q(
          id, classLevel, moduleId, 'Time & Measurement Conversions', diff,
          `Convert ${hrs} hours ${rem} minutes into total minutes.`,
          `${mins} minutes`,
          [`${mins + 30} minutes`, `${hrs * 100 + rem} minutes`, `${mins - 15} minutes`],
          `Multiply the number of hours by 60, then add the extra minutes.`,
          `${hrs} × 60 + ${rem} = ${hrs * 60} + ${rem} = ${mins} minutes.`,
          seed
        ));
      }
    } else if (classLevel === 5) {
      if (moduleNumber === 1) {
        const n1 = 2 + (i % 3);
        const d1 = 4 + (i % 3);
        const n2 = 1 + (i % 2);
        items.push(q(
          id, classLevel, moduleId, 'Adding Like Fractions', diff,
          `Simplify: ${n1}/${d1} + ${n2}/${d1}`,
          `${n1 + n2}/${d1}`,
          [`${n1 + n2}/${d1 * 2}`, `${n1 * n2}/${d1}`, `${n1 + n2 + 1}/${d1}`],
          `When denominators are identical, add only the numerators.`,
          `${n1}/${d1} + ${n2}/${d1} = (${n1} + ${n2})/${d1} = ${n1 + n2}/${d1}.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const a = (12 + i * 3) / 10;
        const b = (5 + i * 2) / 10;
        const sum = (a + b).toFixed(1);
        items.push(q(
          id, classLevel, moduleId, 'Decimals & Place Value', diff,
          `Add the decimals: ${a.toFixed(1)} + ${b.toFixed(1)}`,
          `${sum}`,
          [`${(a + b + 0.2).toFixed(1)}`, `${(a + b - 0.1).toFixed(1)}`, `${(a + b + 1).toFixed(1)}`],
          `Line up the decimal points vertically before adding.`,
          `${a.toFixed(1)} + ${b.toFixed(1)} = ${sum}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const pct = [10, 20, 25, 50, 75, 40, 30, 60, 80][i];
        const whole = 40 + (i % 4) * 20;
        const ans = (pct * whole) / 100;
        items.push(q(
          id, classLevel, moduleId, 'Percentages', diff,
          `What is ${pct}% of ${whole}?`,
          `${ans}`,
          [`${ans + 5}`, `${ans + 10}`, `${Math.max(1, ans - 4)}`],
          `Write ${pct}% as ${pct}/100 and multiply by ${whole}.`,
          `(${pct}/100) × ${whole} = ${ans}.`,
          seed
        ));
      } else {
        const l = 7 + i;
        const b = 5 + (i % 4);
        items.push(q(
          id, classLevel, moduleId, 'Area & Volume Foundations', diff,
          `Calculate the area of a rectangular classroom floor measuring ${l} m by ${b} m.`,
          `${l * b} sq m`,
          [`${2 * (l + b)} sq m`, `${l + b} sq m`, `${l * b + l} sq m`],
          `Area of a rectangle = length × breadth.`,
          `${l} × ${b} = ${l * b} sq m.`,
          seed
        ));
      }
    } else if (classLevel === 6) {
      if (moduleNumber === 1) {
        const a = -8 + i;
        const b = 5 + (i % 6);
        items.push(q(
          id, classLevel, moduleId, 'Integers & Number Line', diff,
          `Evaluate the integer sum: (${a}) + (${b})`,
          `${a + b}`,
          [`${a - b}`, `${a + b + 2}`, `${-(a + b)}`],
          `Move ${b} steps to the right of ${a} on the number line.`,
          `Starting at ${a} and moving +${b} reaches ${a + b}.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const r1 = 2 + (i % 4);
        const r2 = 3 + (i % 5);
        const mult = 4 + (i % 3);
        items.push(q(
          id, classLevel, moduleId, 'Ratio & Proportion', diff,
          `The ratio of boys to girls in a club is ${r1}:${r2}. If there are ${r1 * mult} boys, how many girls are there?`,
          `${r2 * mult}`,
          [`${r1 * mult}`, `${(r1 + r2) * mult}`, `${r2 * (mult + 1)}`],
          `Find what ${r1} was multiplied by to get ${r1 * mult}, then multiply ${r2} by the same factor.`,
          `Scale factor = ${r1 * mult} ÷ ${r1} = ${mult}. Girls = ${r2} × ${mult} = ${r2 * mult}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const k = 3 + (i % 5);
        const x = 4 + i;
        const rhs = k * x + 2;
        items.push(q(
          id, classLevel, moduleId, 'Introduction to Algebra', diff,
          `If ${k}x + 2 = ${rhs}, what is the value of x?`,
          `${x}`,
          [`${x + 1}`, `${x - 1}`, `${x + 2}`],
          `First subtract 2 from ${rhs}, then divide by ${k}.`,
          `${k}x = ${rhs} - 2 = ${k * x}, so x = ${k * x} ÷ ${k} = ${x}.`,
          seed
        ));
      } else {
        const a1 = 40 + i * 5;
        const a2 = 55 + (i % 4) * 5;
        const a3 = 180 - a1 - a2;
        items.push(q(
          id, classLevel, moduleId, 'Angles & Triangles', diff,
          `Two angles of a triangle measure ${a1}° and ${a2}°. What is the third angle?`,
          `${a3}°`,
          [`${180 - a1}°`, `${a3 + 10}°`, `${a3 - 10}°`],
          `The sum of interior angles of any triangle is always 180°.`,
          `180° - (${a1}° + ${a2}°) = 180° - ${a1 + a2}° = ${a3}°.`,
          seed
        ));
      }
    } else if (classLevel === 7) {
      if (moduleNumber === 1) {
        const a = 3 + (i % 4);
        const b = 5 + i;
        const c = 2 * a + b;
        items.push(q(
          id, classLevel, moduleId, 'Linear Equations in One Variable', diff,
          `Solve for y: ${a}(y - 1) + ${b} = ${c}`,
          `3`,
          [`2`, `4`, `5`],
          `Subtract ${b} from both sides first, then divide by ${a}.`,
          `${a}(y - 1) = ${c - b} = ${2 * a}, so y - 1 = 2, hence y = 3.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const cp = 200 + i * 50;
        const profitPct = [10, 20, 25, 15, 30, 10, 20, 25, 40][i];
        const sp = cp + (cp * profitPct) / 100;
        items.push(q(
          id, classLevel, moduleId, 'Profit, Loss & Percentage', diff,
          `A notebook pack is bought for ₹${cp} and sold at a ${profitPct}% profit. Find the selling price.`,
          `₹${sp}`,
          [`₹${sp + 20}`, `₹${cp - (cp * profitPct) / 100}`, `₹${sp - 10}`],
          `Calculate ${profitPct}% of ₹${cp} and add it to the cost price.`,
          `Profit = ${profitPct}% of ${cp} = ₹${(cp * profitPct) / 100}. SP = ${cp} + ${(cp * profitPct) / 100} = ₹${sp}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const r = 7 * (1 + (i % 3));
        const circ = 2 * 22 * (r / 7);
        items.push(q(
          id, classLevel, moduleId, 'Circles & Circumference', diff,
          `Find the circumference of a circle of radius ${r} cm (take π = 22/7).`,
          `${circ} cm`,
          [`${circ / 2} cm`, `${circ + 14} cm`, `${22 * (r / 7) * r} cm`],
          `Use the formula C = 2πr.`,
          `C = 2 × (22/7) × ${r} = ${circ} cm.`,
          seed
        ));
      } else {
        const nums = [10 + i, 14 + i, 18 + i, 22 + i];
        const mean = nums.reduce((s, n) => s + n, 0) / 4;
        items.push(q(
          id, classLevel, moduleId, 'Data Handling & Mean', diff,
          `Find the arithmetic mean of the scores: ${nums.join(', ')}.`,
          `${mean}`,
          [`${mean + 2}`, `${mean - 2}`, `${mean + 4}`],
          `Add all four numbers and divide by 4.`,
          `Sum = ${nums.reduce((s, n) => s + n, 0)}. Mean = ${nums.reduce((s, n) => s + n, 0)} ÷ 4 = ${mean}.`,
          seed
        ));
      }
    } else if (classLevel === 8) {
      if (moduleNumber === 1) {
        const base = 2 + (i % 3);
        const p1 = 2 + (i % 3);
        const p2 = 3 + (i % 2);
        items.push(q(
          id, classLevel, moduleId, 'Laws of Exponents', diff,
          `Simplify using exponent laws: ${base}^${p1} × ${base}^${p2}`,
          `${base}^${p1 + p2}`,
          [`${base}^${p1 * p2}`, `${base * 2}^${p1 + p2}`, `${base}^${Math.abs(p1 - p2)}`],
          `When multiplying powers with the same base, add the exponents.`,
          `a^m × a^n = a^(m+n), so ${base}^${p1} × ${base}^${p2} = ${base}^${p1 + p2}.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const a = 2 + (i % 6);
        const b = 1 + (i % 4);
        const res = a * a - b * b;
        items.push(q(
          id, classLevel, moduleId, 'Algebraic Identities', diff,
          `Using the identity (x + y)(x - y) = x² - y², evaluate (${a} + ${b})(${a} - ${b}).`,
          `${res}`,
          [`${a * a + b * b}`, `${res + 2}`, `${(a - b) * (a - b)}`],
          `Square ${a} and subtract the square of ${b}.`,
          `${a}² - ${b}² = ${a * a} - ${b * b} = ${res}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const d1 = 6 + (i % 4) * 2;
        const d2 = 8 + (i % 3) * 2;
        items.push(q(
          id, classLevel, moduleId, 'Mensuration of Polygons', diff,
          `Find the area of a rhombus whose diagonals are ${d1} cm and ${d2} cm.`,
          `${(d1 * d2) / 2} cm²`,
          [`${d1 * d2} cm²`, `${2 * (d1 + d2)} cm²`, `${(d1 * d2) / 4} cm²`],
          `Area of a rhombus = ½ × d₁ × d₂.`,
          `Area = ½ × ${d1} × ${d2} = ${(d1 * d2) / 2} cm².`,
          seed
        ));
      } else {
        const p = 1000 * (1 + (i % 4));
        const r = 10;
        const ci = Math.round(p * 1.21 - p);
        items.push(q(
          id, classLevel, moduleId, 'Compound Interest', diff,
          `Find the compound interest on ₹${p} at 10% per annum for 2 years compounded annually.`,
          `₹${ci}`,
          [`₹${(p * 20) / 100}`, `₹${ci + 50}`, `₹${ci - 20}`],
          `Use A = P(1 + R/100)^n, then CI = A - P.`,
          `A = ${p} × (1.1)² = ${p * 1.21}. CI = ${p * 1.21} - ${p} = ₹${ci}.`,
          seed
        ));
      }
    } else if (classLevel === 9) {
      if (moduleNumber === 1) {
        const a = 2 + (i % 5);
        items.push(q(
          id, classLevel, moduleId, 'Polynomials & Remainder Theorem', diff,
          `Find the remainder when P(x) = x² + ${a}x + 5 is divided by (x - 1).`,
          `${1 + a + 5}`,
          [`${1 - a + 5}`, `${a + 5}`, `${a}`],
          `By the Remainder Theorem, substitute x = 1 into P(x).`,
          `P(1) = 1² + ${a}(1) + 5 = ${6 + a}.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const x = 3 + (i % 4);
        const y = 4 + (i % 3);
        const distSq = x * x + y * y;
        items.push(q(
          id, classLevel, moduleId, 'Coordinate Geometry', diff,
          `What is the squared distance of point P(${x}, ${y}) from the origin (0, 0)?`,
          `${distSq}`,
          [`${x + y}`, `${Math.abs(x * x - y * y)}`, `${distSq + 4}`],
          `Use d² = x² + y².`,
          `d² = ${x}² + ${y}² = ${x * x} + ${y * y} = ${distSq}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const scale = 1 + (i % 4);
        const a = 3 * scale;
        const b = 4 * scale;
        const c = 5 * scale;
        const area = 6 * scale * scale;
        items.push(q(
          id, classLevel, moduleId, "Heron's Formula", diff,
          `Using Heron's formula, find the area of a triangle with sides ${a} cm, ${b} cm, and ${c} cm.`,
          `${area} cm²`,
          [`${area + 6} cm²`, `${a + b + c} cm²`, `${area * 2} cm²`],
          `First find semi-perimeter s = (a + b + c) / 2, then √(s(s-a)(s-b)(s-c)).`,
          `s = ${(a + b + c) / 2}. √(s(s-a)(s-b)(s-c)) = ${area} cm².`,
          seed
        ));
      } else {
        const r = 3 + (i % 4);
        items.push(q(
          id, classLevel, moduleId, 'Surface Area of Spheres & Cones', diff,
          `What is the total surface area of a sphere of radius ${r} cm in terms of π?`,
          `${4 * r * r}π cm²`,
          [`${2 * r * r}π cm²`, `${r * r}π cm²`, `${Math.round((4 / 3) * r * r * r)}π cm²`],
          `Surface area of a sphere = 4πr².`,
          `4 × π × ${r}² = ${4 * r * r}π cm².`,
          seed
        ));
      }
    } else {
      // Class 10
      if (moduleNumber === 1) {
        const r1 = 2 + (i % 4);
        const r2 = 3 + (i % 5);
        const b = -(r1 + r2);
        const c = r1 * r2;
        items.push(q(
          id, classLevel, moduleId, 'Quadratic Equations', diff,
          `What is the sum of the roots of the quadratic equation x² ${b}x + ${c} = 0?`,
          `${r1 + r2}`,
          [`${-(r1 + r2)}`, `${r1 * r2}`, `${Math.abs(r1 - r2)}`],
          `For ax² + bx + c = 0, sum of roots = -b / a.`,
          `-b / a = -(${b}) / 1 = ${r1 + r2}.`,
          seed
        ));
      } else if (moduleNumber === 2) {
        const a = 3 + (i % 5);
        const d = 4 + (i % 4);
        const n = 5 + (i % 4);
        const nth = a + (n - 1) * d;
        items.push(q(
          id, classLevel, moduleId, 'Arithmetic Progressions (AP)', diff,
          `Find the ${n}th term of the AP: ${a}, ${a + d}, ${a + 2 * d}, ...`,
          `${nth}`,
          [`${nth + d}`, `${nth - d}`, `${a + n * d}`],
          `Use aₙ = a + (n - 1)d.`,
          `a_${n} = ${a} + (${n} - 1)×${d} = ${a} + ${(n - 1) * d} = ${nth}.`,
          seed
        ));
      } else if (moduleNumber === 3) {
        const trigPrompts = [
          { q: 'Evaluate sin 30° + cos 60°.', ans: '1', dist: ['1/2', '√3/2', '2'] as [string, string, string], exp: 'sin 30° = 1/2 and cos 60° = 1/2, so 1/2 + 1/2 = 1.' },
          { q: 'What is the value of tan 45° + sec² 0°?', ans: '2', dist: ['1', '0', '√2'] as [string, string, string], exp: 'tan 45° = 1 and sec 0° = 1, so 1 + 1 = 2.' },
          { q: 'If sin θ = 3/5 in a right triangle, what is cos θ?', ans: '4/5', dist: ['3/4', '5/4', '1/5'] as [string, string, string], exp: 'Using sin²θ + cos²θ = 1, cos θ = √(1 - 9/25) = 4/5.' },
        ];
        const tp = trigPrompts[i % trigPrompts.length];
        items.push(q(
          id, classLevel, moduleId, 'Trigonometric Ratios & Identities', diff,
          tp.q,
          tp.ans,
          tp.dist,
          `Recall standard angle values (0°, 30°, 45°, 60°, 90°) and sin²θ + cos²θ = 1.`,
          tp.exp,
          seed
        ));
      } else {
        const fav = 2 + (i % 4);
        const total = 8 + (i % 5);
        items.push(q(
          id, classLevel, moduleId, 'Probability & Statistics', diff,
          `A bag contains ${fav} red balls and ${total - fav} blue balls. What is the probability of drawing a red ball?`,
          `${fav}/${total}`,
          [`${total - fav}/${total}`, `${fav}/${total - fav}`, `1/${total}`],
          `Probability = (Favourable outcomes) / (Total outcomes).`,
          `P(Red) = ${fav} / (${fav} + ${total - fav}) = ${fav}/${total}.`,
          seed
        ));
      }
    }
  }

  return items;
}
