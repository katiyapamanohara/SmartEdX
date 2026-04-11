// Curated catalog of embeddable virtual lab simulations
// Sources: PhET Interactive Simulations (phet.colorado.edu) — free, open-source
//          GeoGebra (geogebra.org) — free for education
//          Others: MIT, NTNUJAVA

export interface Simulation {
  id: string;
  title: string;
  description: string;
  subject: SimSubject;
  topic: string;
  gradeLevel: string;      // e.g. "Grade 9-12" or "University"
  difficulty: "beginner" | "intermediate" | "advanced";
  url: string;             // iframe src
  thumbnail: string;       // emoji or image url
  source: string;          // "PhET" | "GeoGebra" | "Other"
  tags: string[];
  estimatedMinutes: number;
}

export type SimSubject = "physics" | "chemistry" | "biology" | "mathematics" | "engineering" | "earth_science";

export const SIMULATION_CATALOG: Simulation[] = [

  // ══════════════════════════════════════════════════════════════
  // PHYSICS
  // ══════════════════════════════════════════════════════════════

  {
    id: "phet-projectile",
    title: "Projectile Motion",
    description: "Explore how initial speed, angle, and gravity affect the trajectory of a launched object. Fire cannon balls and baseballs.",
    subject: "physics",
    topic: "Kinematics",
    gradeLevel: "Grade 9-12",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html",
    thumbnail: "🎯",
    source: "PhET",
    tags: ["motion", "kinematics", "gravity", "trajectory"],
    estimatedMinutes: 30,
  },
  {
    id: "phet-forces-motion",
    title: "Forces and Motion: Basics",
    description: "Explore Newton's Laws by pushing furniture and applying forces. See how mass, friction, and applied force affect acceleration.",
    subject: "physics",
    topic: "Newton's Laws",
    gradeLevel: "Grade 8-10",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html",
    thumbnail: "💪",
    source: "PhET",
    tags: ["forces", "newton", "friction", "acceleration"],
    estimatedMinutes: 25,
  },
  {
    id: "phet-wave-interference",
    title: "Wave Interference",
    description: "Make waves with a dripping faucet, audio speaker, or laser. Visualize wave interference, diffraction, and the wave-particle duality of light.",
    subject: "physics",
    topic: "Waves & Optics",
    gradeLevel: "Grade 10-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_en.html",
    thumbnail: "🌊",
    source: "PhET",
    tags: ["waves", "interference", "diffraction", "light", "sound"],
    estimatedMinutes: 40,
  },
  {
    id: "phet-pendulum",
    title: "Pendulum Lab",
    description: "Play with pendulums and discover how length, mass, and gravity affect the period of oscillation.",
    subject: "physics",
    topic: "Simple Harmonic Motion",
    gradeLevel: "Grade 9-11",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html",
    thumbnail: "⏱️",
    source: "PhET",
    tags: ["pendulum", "oscillation", "period", "gravity"],
    estimatedMinutes: 25,
  },
  {
    id: "phet-circuit-dc",
    title: "Circuit Construction Kit: DC",
    description: "Build circuits with batteries, resistors, light bulbs, switches, and wires. Measure voltage and current with a virtual multimeter.",
    subject: "physics",
    topic: "Electricity & Circuits",
    gradeLevel: "Grade 9-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html",
    thumbnail: "⚡",
    source: "PhET",
    tags: ["circuits", "electricity", "ohm", "voltage", "current"],
    estimatedMinutes: 45,
  },
  {
    id: "phet-gravity",
    title: "Gravity Force Lab",
    description: "Visualize the gravitational force between two masses. Observe how mass and distance affect gravitational attraction.",
    subject: "physics",
    topic: "Gravity",
    gradeLevel: "Grade 9-11",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/gravity-force-lab/latest/gravity-force-lab_en.html",
    thumbnail: "🌍",
    source: "PhET",
    tags: ["gravity", "newton", "force", "mass", "distance"],
    estimatedMinutes: 20,
  },
  {
    id: "phet-energy-skate",
    title: "Energy Skate Park",
    description: "Explore conservation of energy using a skate park. Build tracks, ramps, and jumps for the skater and measure kinetic and potential energy.",
    subject: "physics",
    topic: "Energy Conservation",
    gradeLevel: "Grade 9-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_en.html",
    thumbnail: "🛹",
    source: "PhET",
    tags: ["energy", "kinetic", "potential", "conservation"],
    estimatedMinutes: 35,
  },
  {
    id: "phet-optics",
    title: "Geometric Optics",
    description: "How does a lens form an image? See how light rays are refracted by a converging or diverging lens. Explore the relationship between image distance and object distance.",
    subject: "physics",
    topic: "Optics",
    gradeLevel: "Grade 10-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/geometric-optics/latest/geometric-optics_en.html",
    thumbnail: "🔭",
    source: "PhET",
    tags: ["optics", "lens", "refraction", "focal length"],
    estimatedMinutes: 30,
  },

  // ══════════════════════════════════════════════════════════════
  // CHEMISTRY
  // ══════════════════════════════════════════════════════════════

  {
    id: "phet-build-atom",
    title: "Build an Atom",
    description: "Build atoms from scratch by adding protons, neutrons, and electrons. Learn about atomic structure, isotopes, and ions.",
    subject: "chemistry",
    topic: "Atomic Structure",
    gradeLevel: "Grade 8-10",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_en.html",
    thumbnail: "⚛️",
    source: "PhET",
    tags: ["atoms", "protons", "neutrons", "electrons", "periodic table"],
    estimatedMinutes: 30,
  },
  {
    id: "phet-molecule-shapes",
    title: "Molecule Shapes",
    description: "Explore molecule shapes by building molecules in 3D. See how lone pairs and bonding pairs of electrons affect molecular shape.",
    subject: "chemistry",
    topic: "Molecular Geometry",
    gradeLevel: "Grade 10-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/molecule-shapes/latest/molecule-shapes_en.html",
    thumbnail: "🧬",
    source: "PhET",
    tags: ["molecules", "VSEPR", "bonding", "3D structure"],
    estimatedMinutes: 35,
  },
  {
    id: "phet-acid-base",
    title: "Acid-Base Solutions",
    description: "How do strong and weak acids differ? Visualize the relative number of ions at the molecular level and test solutions with a pH meter.",
    subject: "chemistry",
    topic: "Acids & Bases",
    gradeLevel: "Grade 10-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/acid-base-solutions/latest/acid-base-solutions_en.html",
    thumbnail: "🧪",
    source: "PhET",
    tags: ["acid", "base", "pH", "ions", "equilibrium"],
    estimatedMinutes: 40,
  },
  {
    id: "phet-gas-properties",
    title: "Gas Properties",
    description: "Pump gas molecules to a box and see what happens as you change the volume, add or remove heat, and more. Measure temperature, pressure, and volume.",
    subject: "chemistry",
    topic: "Gas Laws",
    gradeLevel: "Grade 10-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/gas-properties/latest/gas-properties_en.html",
    thumbnail: "💨",
    source: "PhET",
    tags: ["gas laws", "pressure", "temperature", "volume", "Boyle", "Charles"],
    estimatedMinutes: 35,
  },
  {
    id: "phet-reactions-rates",
    title: "Reactions & Rates",
    description: "Explore what makes a reaction happen by colliding atoms and molecules. Design experiments that determine how factors such as concentration affect reaction rates.",
    subject: "chemistry",
    topic: "Chemical Kinetics",
    gradeLevel: "Grade 11-12",
    difficulty: "advanced",
    url: "https://phet.colorado.edu/sims/html/reactions-and-rates/latest/reactions-and-rates_en.html",
    thumbnail: "🔥",
    source: "PhET",
    tags: ["kinetics", "collision theory", "activation energy", "reaction rate"],
    estimatedMinutes: 45,
  },
  {
    id: "phet-states-matter",
    title: "States of Matter",
    description: "Watch different types of molecules form a solid, liquid, or gas. Change the temperature or volume of a container and see a pressure-temperature diagram respond.",
    subject: "chemistry",
    topic: "States of Matter",
    gradeLevel: "Grade 8-10",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html",
    thumbnail: "🧊",
    source: "PhET",
    tags: ["solid", "liquid", "gas", "phase change", "temperature"],
    estimatedMinutes: 25,
  },

  // ══════════════════════════════════════════════════════════════
  // BIOLOGY
  // ══════════════════════════════════════════════════════════════

  {
    id: "phet-natural-selection",
    title: "Natural Selection",
    description: "Add bunnies, wolves, and food and watch the population change. Turn on traits like fur color and observe how natural selection works over generations.",
    subject: "biology",
    topic: "Evolution & Genetics",
    gradeLevel: "Grade 9-11",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html",
    thumbnail: "🐇",
    source: "PhET",
    tags: ["evolution", "natural selection", "genetics", "adaptation"],
    estimatedMinutes: 40,
  },
  {
    id: "phet-gene-expression",
    title: "Gene Expression — Basics",
    description: "Explore how genes are expressed through transcription and translation. Understand how proteins are synthesized from DNA instructions.",
    subject: "biology",
    topic: "Genetics & Molecular Biology",
    gradeLevel: "Grade 10-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_en.html",
    thumbnail: "🧬",
    source: "PhET",
    tags: ["DNA", "RNA", "protein", "transcription", "translation"],
    estimatedMinutes: 45,
  },
  {
    id: "phet-membrane-channels",
    title: "Membrane Channels",
    description: "Visualize how different molecules cross cell membranes through channels. Explore active transport, facilitated diffusion, and osmosis.",
    subject: "biology",
    topic: "Cell Biology",
    gradeLevel: "Grade 10-12",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/membrane-channels/latest/membrane-channels_en.html",
    thumbnail: "🫧",
    source: "PhET",
    tags: ["cell membrane", "osmosis", "diffusion", "transport"],
    estimatedMinutes: 30,
  },

  // ══════════════════════════════════════════════════════════════
  // MATHEMATICS
  // ══════════════════════════════════════════════════════════════

  {
    id: "geo-graphing",
    title: "Graphing Calculator",
    description: "Plot functions, investigate equations, and explore the world of mathematics interactively. Supports 2D/3D graphing, calculus, and statistics.",
    subject: "mathematics",
    topic: "Functions & Graphing",
    gradeLevel: "Grade 9-University",
    difficulty: "beginner",
    url: "https://www.geogebra.org/graphing",
    thumbnail: "📈",
    source: "GeoGebra",
    tags: ["functions", "graphing", "algebra", "calculus"],
    estimatedMinutes: 30,
  },
  {
    id: "geo-geometry",
    title: "Interactive Geometry",
    description: "Construct and explore geometric shapes, angles, and transformations. Dynamic environment for discovering geometric relationships.",
    subject: "mathematics",
    topic: "Geometry",
    gradeLevel: "Grade 8-12",
    difficulty: "beginner",
    url: "https://www.geogebra.org/geometry",
    thumbnail: "📐",
    source: "GeoGebra",
    tags: ["geometry", "shapes", "angles", "triangles", "transformations"],
    estimatedMinutes: 35,
  },
  {
    id: "geo-3d",
    title: "3D Calculator",
    description: "Visualize 3D surfaces, curves, and solids. Explore multivariable calculus and 3D geometry interactively.",
    subject: "mathematics",
    topic: "3D Geometry & Calculus",
    gradeLevel: "Grade 11-University",
    difficulty: "advanced",
    url: "https://www.geogebra.org/3d",
    thumbnail: "🧊",
    source: "GeoGebra",
    tags: ["3D", "surfaces", "multivariable", "vectors"],
    estimatedMinutes: 40,
  },
  {
    id: "phet-fraction-basics",
    title: "Fractions: Basics",
    description: "Build fractions from shapes and numbers. Understand how parts of a whole relate to each other with visual representations.",
    subject: "mathematics",
    topic: "Fractions",
    gradeLevel: "Grade 3-6",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/fractions-basics/latest/fractions-basics_en.html",
    thumbnail: "½",
    source: "PhET",
    tags: ["fractions", "numerator", "denominator", "parts"],
    estimatedMinutes: 20,
  },
  {
    id: "phet-area-builder",
    title: "Area Builder",
    description: "Create shapes using colorful tiles. Explore the relationship between area and perimeter by building different shapes.",
    subject: "mathematics",
    topic: "Area & Perimeter",
    gradeLevel: "Grade 4-7",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_en.html",
    thumbnail: "🟦",
    source: "PhET",
    tags: ["area", "perimeter", "geometry", "shapes"],
    estimatedMinutes: 25,
  },

  // ══════════════════════════════════════════════════════════════
  // ENGINEERING
  // ══════════════════════════════════════════════════════════════

  {
    id: "phet-circuit-ac",
    title: "Circuit Construction Kit: AC",
    description: "Build AC circuits with capacitors, inductors, and AC sources. Measure current, voltage, and phase. Explore resonance and filters.",
    subject: "engineering",
    topic: "AC Circuits",
    gradeLevel: "Grade 11-University",
    difficulty: "advanced",
    url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-ac/latest/circuit-construction-kit-ac_en.html",
    thumbnail: "🔌",
    source: "PhET",
    tags: ["AC", "circuits", "capacitor", "inductor", "impedance"],
    estimatedMinutes: 50,
  },
  {
    id: "geo-spreadsheet",
    title: "Data Analysis & Statistics",
    description: "Analyze data sets, create statistical plots, compute regression lines, and explore probability distributions interactively.",
    subject: "engineering",
    topic: "Data Analysis",
    gradeLevel: "Grade 10-University",
    difficulty: "intermediate",
    url: "https://www.geogebra.org/spreadsheet",
    thumbnail: "📊",
    source: "GeoGebra",
    tags: ["statistics", "data", "regression", "probability"],
    estimatedMinutes: 35,
  },
  {
    id: "phet-faraday",
    title: "Faraday's Electromagnetic Lab",
    description: "Experiment with Faraday's law using a bar magnet, coils, and a generator. Observe how moving magnets create electric current.",
    subject: "engineering",
    topic: "Electromagnetism",
    gradeLevel: "Grade 10-University",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/faradays-law/latest/faradays-law_en.html",
    thumbnail: "🧲",
    source: "PhET",
    tags: ["electromagnetism", "faraday", "induction", "generator", "motor"],
    estimatedMinutes: 40,
  },
  {
    id: "phet-capacitor",
    title: "Capacitor Lab: Basics",
    description: "Explore how a capacitor works. Change the size of the plates, separation, and dielectric material to understand capacitance.",
    subject: "engineering",
    topic: "Electronics",
    gradeLevel: "Grade 11-University",
    difficulty: "intermediate",
    url: "https://phet.colorado.edu/sims/html/capacitor-lab-basics/latest/capacitor-lab-basics_en.html",
    thumbnail: "🔋",
    source: "PhET",
    tags: ["capacitor", "electric field", "dielectric", "charge"],
    estimatedMinutes: 30,
  },

  // ══════════════════════════════════════════════════════════════
  // EARTH SCIENCE
  // ══════════════════════════════════════════════════════════════

  {
    id: "phet-plate-tectonics",
    title: "Plate Tectonics",
    description: "Explore how convection drives plate movement. Move continents, observe mountain building, earthquakes, and volcanoes.",
    subject: "earth_science",
    topic: "Plate Tectonics",
    gradeLevel: "Grade 6-10",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/plate-tectonics/latest/plate-tectonics_en.html",
    thumbnail: "🌋",
    source: "PhET",
    tags: ["tectonics", "plates", "earthquakes", "volcanoes", "geology"],
    estimatedMinutes: 35,
  },
  {
    id: "phet-greenhouse",
    title: "The Greenhouse Effect",
    description: "Explore how the greenhouse effect works. Change the concentration of greenhouse gases and observe how it affects global temperature.",
    subject: "earth_science",
    topic: "Climate Science",
    gradeLevel: "Grade 7-10",
    difficulty: "beginner",
    url: "https://phet.colorado.edu/sims/html/greenhouse-effect/latest/greenhouse-effect_en.html",
    thumbnail: "🌡️",
    source: "PhET",
    tags: ["greenhouse", "climate", "atmosphere", "CO2", "global warming"],
    estimatedMinutes: 25,
  },
];

export const SUBJECT_LABELS: Record<SimSubject, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  mathematics: "Mathematics",
  engineering: "Engineering",
  earth_science: "Earth Science",
};

export const SUBJECT_ICONS: Record<SimSubject, string> = {
  physics: "⚡",
  chemistry: "🧪",
  biology: "🧬",
  mathematics: "📐",
  engineering: "⚙️",
  earth_science: "🌍",
};

export const SUBJECT_COLORS: Record<SimSubject, string> = {
  physics: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  chemistry: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  biology: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  mathematics: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  engineering: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  earth_science: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

export const DIFFICULTY_COLORS = {
  beginner: "bg-green-100 text-green-600",
  intermediate: "bg-yellow-100 text-yellow-600",
  advanced: "bg-red-100 text-red-600",
};

export const ALL_SUBJECTS = Object.keys(SUBJECT_LABELS) as SimSubject[];

// Hex background colors for inline styles (cards, headers)
const SUBJECT_BG_HEX: Record<SimSubject, string> = {
  physics: "#dbeafe",
  chemistry: "#dcfce7",
  biology: "#d1fae5",
  mathematics: "#ede9fe",
  engineering: "#ffedd5",
  earth_science: "#ccfbf1",
};

// Combined subject metadata (label + icon + color) used by UI pages
export const SUBJECT_META: Record<string, { label: string; icon: string; color: string }> =
  Object.fromEntries(
    ALL_SUBJECTS.map((s) => [
      s,
      {
        label: SUBJECT_LABELS[s],
        icon: SUBJECT_ICONS[s],
        color: SUBJECT_BG_HEX[s],  // hex for style={{ background }}
      },
    ])
  );

// Alias for convenience
export const SIMULATIONS = SIMULATION_CATALOG;

export const PLATFORM_FEATURES = {
  VIRTUAL_LABS: "virtual_labs",
  AI_TOOLS: "ai_tools",
  VOICE_AGENT: "voice_agent",
  EXAM_PROCTORING: "exam_proctoring",
  LIVE_SESSIONS: "live_sessions",
  RECORDINGS: "recordings",
  ADVANCED_REPORTS: "advanced_reports",
} as const;

export type PlatformFeature = typeof PLATFORM_FEATURES[keyof typeof PLATFORM_FEATURES];

export const PLAN_DEFAULTS: Record<string, PlatformFeature[]> = {
  starter: ["live_sessions", "recordings"],
  pro: ["live_sessions", "recordings", "ai_tools", "exam_proctoring", "advanced_reports"],
  enterprise: ["live_sessions", "recordings", "ai_tools", "exam_proctoring", "advanced_reports", "virtual_labs", "voice_agent"],
};

export const FEATURE_META: Record<PlatformFeature, { label: string; description: string; icon: string; plans: string[] }> = {
  live_sessions: { label: "Live Sessions", description: "Real-time virtual classes with Socket.IO", icon: "🎥", plans: ["starter", "pro", "enterprise"] },
  recordings: { label: "Video Recordings", description: "Upload and manage recorded lectures with timed questions", icon: "📹", plans: ["starter", "pro", "enterprise"] },
  ai_tools: { label: "Teacher AI Tools", description: "Lesson plan generator, essay grader, class insights, at-risk alerts", icon: "🤖", plans: ["pro", "enterprise"] },
  exam_proctoring: { label: "Exam Proctoring", description: "Face ID verification and integrity monitoring during exams", icon: "🔐", plans: ["pro", "enterprise"] },
  advanced_reports: { label: "Advanced Reports", description: "Student performance reports with CSV and PDF export", icon: "📊", plans: ["pro", "enterprise"] },
  virtual_labs: { label: "Virtual Labs", description: "Physics, chemistry, biology and engineering simulations", icon: "🧫", plans: ["enterprise"] },
  voice_agent: { label: "Voice Learning Agent", description: "Real-time voice AI tutor powered by Gemini Live", icon: "🎙️", plans: ["enterprise"] },
};
