"""Author child-facing names for the rest of the K-5 graph.

A standard code is an internal identifier; `kid` is what an 8-11 year old
reads. The rule for every line below: say what she would DO, in words she
already owns. "Bottom number", never "denominator". "How many times bigger",
never "multiplicative comparison".

Until this ran, only fractions had names, which is why the app looked like a
fractions app when fractions is only the fourth-largest family in the graph.
"""
import io, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))

NEW = {
    # ---- Counting -------------------------------------------------------
    "K.CC.A.2":   ("Counting on from any number", "Count forward from a given number"),
    "K.CC.B.4.a": ("One number for each thing", "One-to-one correspondence when counting"),
    "K.CC.B.4.b": ("The last number tells you how many", "Cardinality of the final count word"),
    "K.CC.B.5":   ("Counting things to answer 'how many?'", "Count up to 20 objects to answer how many"),
    "K.CC.C.6":   ("Which group has more?", "Compare group sizes as greater, less or equal"),
    "K.CC.C.7":   ("Which number is bigger?", "Compare written numerals 1-10"),

    # ---- Shapes ---------------------------------------------------------
    "1.G.A.1":  ("What makes a shape that shape", "Defining versus non-defining attributes"),
    "2.G.A.1":  ("Drawing a shape to order", "Recognise and draw shapes with given attributes"),
    "3.G.A.1":  ("Shapes that belong to the same family", "Shared attributes across shape categories"),
    "3.G.A.2":  ("Splitting a shape into equal areas", "Partition shapes into equal-area parts"),
    "4.G.A.1":  ("Lines, corners and angles", "Draw points, lines, rays, angles, parallels"),
    "4.G.A.2":  ("Sorting shapes by their lines", "Classify figures by parallel or perpendicular sides"),
    "4.G.A.3":  ("Folding a shape in half", "Recognise a line of symmetry"),
    "5.G.A.1":  ("Finding a spot using two numbers", "Coordinate system from perpendicular axes"),
    "5.G.A.2":  ("Plotting points on a grid", "Graph points in the first quadrant"),
    "5.G.B.3":  ("What every rectangle has in common", "Attributes inherited by subcategories"),
    "5.G.B.4":  ("Sorting shapes into families", "Classify two-dimensional figures in a hierarchy"),
    "K.G.B.4":  ("Comparing flat shapes and solid ones", "Analyse and compare 2-D and 3-D shapes"),
    "K.G.B.5":  ("Building shapes yourself", "Model shapes from components"),

    # ---- Measuring & data ----------------------------------------------
    "1.MD.B.3":   ("Telling the time to the half hour", "Tell and write time to the half hour"),
    "1.MD.C.4":   ("Sorting things into groups and counting them", "Organise and interpret data in up to three categories"),
    "2.MD.A.4":   ("How much longer is this one?", "Express a length difference in standard units"),
    "2.MD.B.5":   ("Length word problems", "Add and subtract within 100 to solve length problems"),
    "2.MD.C.7":   ("Telling the time to five minutes", "Tell and write time to the nearest five minutes"),
    "2.MD.C.8":   ("Coins and money problems", "Solve word problems with dollars and cents"),
    "2.MD.D.10":  ("Drawing picture graphs and bar graphs", "Draw picture and bar graphs with a single-unit scale"),
    "2.MD.D.9":   ("Measuring lots of things and charting them", "Generate measurement data and show it on a line plot"),
    "3.MD.A.2":   ("Weighing things and measuring liquid", "Measure and estimate liquid volume and mass"),
    "3.MD.B.3":   ("Graphs where one square means more than one", "Draw scaled picture and bar graphs"),
    "3.MD.B.4":   ("Measuring to halves and quarters of an inch", "Generate measurement data to halves and fourths"),
    "3.MD.C.6":   ("Finding area by counting squares", "Measure area by counting unit squares"),
    "3.MD.C.7.a": ("Covering a rectangle with squares", "Find rectangle area by tiling"),
    "3.MD.C.7.b": ("Area by multiplying the sides", "Multiply side lengths to find area"),
    "3.MD.C.7.c": ("Why counting squares and multiplying agree", "Tiling shows area as the distributive property"),
    "3.MD.C.7.d": ("Area of an odd shape by splitting it up", "Area is additive across non-overlapping parts"),
    "3.MD.D.8":   ("The distance all the way around", "Solve problems involving perimeter of polygons"),
    "4.MD.A.1":   ("How big each unit is next to another", "Relative sizes of units within one system"),
    "4.MD.A.2":   ("Measuring word problems", "Use four operations on distance, time, volume and money"),
    "4.MD.A.3":   ("Area and perimeter formulas", "Apply area and perimeter formulas for rectangles"),
    "4.MD.B.4":   ("Line plots with fractions on them", "Make a line plot of fractional measurements"),
    "4.MD.C.5":   ("What an angle actually is", "Recognise angles formed by two rays at a point"),
    "4.MD.C.6":   ("Measuring angles with a protractor", "Measure and sketch angles in whole-number degrees"),
    "4.MD.C.7":   ("Adding two angles together", "Angle measure is additive"),
    "5.MD.A.1":   ("Changing from one unit to another", "Convert among standard units within a system"),
    "5.MD.B.2":   ("Line plots with fraction measurements", "Line plots of measurements in fractions of a unit"),
    "5.MD.C.3":   ("What volume means", "Recognise volume as an attribute of solid figures"),
    "5.MD.C.4":   ("Volume by counting cubes", "Measure volume by counting unit cubes"),
    "5.MD.C.5.a": ("Packing a box with cubes", "Volume of a right rectangular prism by packing"),
    "5.MD.C.5.b": ("Working out volume with a formula", "Apply V = l x w x h and V = b x h"),
    "5.MD.C.5.c": ("Volume of two boxes stuck together", "Volume is additive across non-overlapping prisms"),
    "K.MD.B.3":   ("Sorting objects into groups", "Classify objects into categories and count them"),

    # ---- Big numbers & place value -------------------------------------
    "1.NBT.B.3": ("Comparing two-digit numbers", "Compare two-digit numbers using tens and ones"),
    "2.NBT.A.1": ("Hundreds, tens and ones", "Three-digit numbers as hundreds, tens and ones"),
    "2.NBT.A.2": ("Counting to 1000, and skip counting", "Count within 1000; skip-count by 5s, 10s, 100s"),
    "2.NBT.A.3": ("Writing numbers up to a thousand", "Read and write numbers to 1000 in several forms"),
    "2.NBT.A.4": ("Comparing three-digit numbers", "Compare three-digit numbers using place value"),
    "2.NBT.B.5": ("Adding and taking away up to 100", "Fluently add and subtract within 100"),
    "2.NBT.B.6": ("Adding four numbers at once", "Add up to four two-digit numbers"),
    "2.NBT.B.7": ("Adding and taking away up to 1000", "Add and subtract within 1000"),
    "2.NBT.B.8": ("Adding ten or a hundred in your head", "Mentally add or subtract 10 or 100"),
    "2.NBT.B.9": ("Explaining why your way works", "Explain why addition and subtraction strategies work"),
    "3.NBT.A.1": ("Rounding to the nearest ten or hundred", "Round whole numbers to the nearest 10 or 100"),
    "3.NBT.A.2": ("Adding and taking away bigger numbers", "Fluently add and subtract within 1000"),
    "3.NBT.A.3": ("Multiplying by tens", "Multiply one-digit numbers by multiples of 10"),
    "4.NBT.A.1": ("Each place is worth ten of the next", "A digit represents ten times the place to its right"),
    "4.NBT.A.2": ("Reading and writing really big numbers", "Read and write multi-digit numbers in several forms"),
    "4.NBT.A.3": ("Rounding big numbers", "Round multi-digit whole numbers to any place"),
    "4.NBT.B.4": ("Column adding and taking away", "Fluently add and subtract using the standard algorithm"),
    "4.NBT.B.5": ("Multiplying big numbers", "Multiply up to four digits by one digit"),
    "4.NBT.B.6": ("Sharing big numbers out", "Find quotients and remainders with four-digit dividends"),
    "5.NBT.A.1": ("Places worth ten times more, or a tenth", "Place value across whole numbers and decimals"),
    "5.NBT.A.2": ("What happens to the zeros", "Patterns of zeros when multiplying by powers of 10"),
    "5.NBT.A.3": ("Reading and comparing decimals", "Read, write and compare decimals to thousandths"),
    "5.NBT.A.4": ("Rounding decimals", "Round decimals to any place"),
    "5.NBT.B.5": ("Multiplying big numbers the set way", "Fluently multiply multi-digit numbers"),
    "5.NBT.B.6": ("Long division", "Quotients with four-digit dividends and two-digit divisors"),
    "5.NBT.B.7": ("Adding and multiplying decimals", "Operate on decimals to hundredths"),

    # ---- Fractions (the rest) ------------------------------------------
    "4.NF.B.4":   ("Multiplying a fraction by a whole number", "Multiply a fraction by a whole number"),
    "4.NF.B.4.a": ("A fraction as lots of one piece", "Understand a/b as a multiple of 1/b"),
    "4.NF.B.4.b": ("Multiplying by counting the pieces", "A multiple of a/b as a multiple of 1/b"),
    "4.NF.B.4.c": ("Fraction times a whole number, in a story", "Word problems multiplying a fraction by a whole number"),
    "4.NF.C.5":   ("Tenths and hundredths together", "Express tenths as an equivalent fraction in hundredths"),
    "4.NF.C.6":   ("Fractions written as decimals", "Use decimal notation for tenths and hundredths"),
    "4.NF.C.7":   ("Which decimal is bigger?", "Compare two decimals to hundredths"),
    "5.NF.B.3":   ("A fraction is a sharing sum", "Interpret a fraction as division of numerator by denominator"),
    "5.NF.B.4":   ("Multiplying two fractions", "Multiply a fraction by a fraction or whole number"),
    "5.NF.B.5":   ("When multiplying makes something smaller", "Interpret multiplication as scaling"),
    "5.NF.B.6":   ("Fraction multiplying in a story", "Real-world problems multiplying fractions and mixed numbers"),
    "5.NF.B.7":   ("Sharing with unit fractions", "Divide unit fractions by whole numbers and back"),

    # ---- Times tables & word problems ----------------------------------
    "1.OA.A.2": ("Adding three numbers together", "Word problems adding three whole numbers within 20"),
    "2.OA.B.2": ("Knowing your number bonds by heart", "Fluently add and subtract within 20 from memory"),
    "3.OA.A.4": ("Finding the missing number in a times sum", "Determine the unknown in a multiplication or division equation"),
    "3.OA.B.5": ("Multiplying in whatever order suits you", "Properties of operations as multiplication strategies"),
    "3.OA.B.6": ("Dividing by asking 'times what?'", "Understand division as an unknown-factor problem"),
    "3.OA.C.7": ("Knowing your times tables", "Fluently multiply and divide within 100"),
    "3.OA.D.8": ("Two-step word problems", "Solve two-step word problems using the four operations"),
    "3.OA.D.9": ("Spotting patterns in number tables", "Identify arithmetic patterns and explain them"),
    "4.OA.A.1": ("How many times bigger", "Interpret a multiplication equation as a comparison"),
    "4.OA.A.3": ("Word problems with several steps", "Multistep word problems with whole-number answers"),
    "4.OA.B.4": ("Factors, multiples and primes", "Find factor pairs; recognise primes and composites"),
    "4.OA.C.5": ("Making a pattern from a rule", "Generate a number or shape pattern from a rule"),
    "5.OA.A.1": ("Brackets in a sum", "Use and evaluate expressions with grouping symbols"),
    "5.OA.A.2": ("Writing a sum without working it out", "Write and interpret simple numerical expressions"),
    "5.OA.B.3": ("Comparing two patterns side by side", "Generate two patterns and identify relationships"),
}


def main():
    path = f"{ROOT}/naming.json"
    d = json.load(io.open(path, encoding="utf-8"))
    before = len(d["nodes"])
    for code, (kid, teacher) in NEW.items():
        d["nodes"].setdefault(code, {})
        d["nodes"][code].update({"kid": kid, "teacher": teacher})
        d["nodes"][code].setdefault("reteach", "")
    json.dump(d, io.open(path, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"named {len(NEW)} more; {before} -> {len(d['nodes'])} total")


if __name__ == "__main__":
    main()
