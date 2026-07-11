import { useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  Hash,
  Ruler,
  Compass,
  Users,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Crosshair
} from 'lucide-react';

const FrontBackMiniField = ({ direction }) => {
  const isInFront = direction === 'front';
  const dotY = isInFront ? 210 : 70;
  const arrowEndY = isInFront ? 194 : 86;
  const arrowPoints = isInFront ? '140,200 130,183 150,183' : '140,80 130,97 150,97';
  const titleId = `front-back-${direction}-title`;
  const descriptionId = `front-back-${direction}-description`;

  return (
    <article className="front-back-diagram-card">
      <h3>{isInFront ? 'In front of' : 'Behind'}</h3>
      <p>{isInFront ? 'Move toward the front sideline' : 'Move toward the back sideline'}</p>
      <svg
        viewBox="0 0 280 280"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{isInFront ? 'In front of a hash' : 'Behind a hash'}</title>
        <desc id={descriptionId}>
          {isInFront
            ? 'The performer moves from the reference hash toward the front and home sideline.'
            : 'The performer moves from the reference hash toward the back and visitor sideline.'}
        </desc>
        <rect x="18" y="18" width="244" height="244" rx="14" fill="#123c32" />
        <g stroke="rgba(255,255,255,0.28)" strokeWidth="2">
          <line x1="72" y1="18" x2="72" y2="262" />
          <line x1="140" y1="18" x2="140" y2="262" />
          <line x1="208" y1="18" x2="208" y2="262" />
        </g>
        <line x1="34" y1="140" x2="246" y2="140" stroke="rgba(255,255,255,0.82)" strokeWidth="6" strokeDasharray="10 10" />
        <text x="140" y="130" fill="rgba(255,255,255,0.76)" fontSize="13" fontWeight="800" textAnchor="middle">REFERENCE HASH</text>
        <text x="140" y="35" fill="rgba(255,255,255,0.62)" fontSize="11" fontWeight="800" textAnchor="middle">BACK / VISITOR</text>
        <text x="140" y="252" fill="rgba(255,255,255,0.7)" fontSize="11" fontWeight="800" textAnchor="middle">FRONT / HOME · AUDIENCE</text>
        <line x1="140" y1="140" x2="140" y2={arrowEndY} stroke="#60a5fa" strokeWidth="5" />
        <polygon points={arrowPoints} fill="#60a5fa" />
        <circle cx="140" cy={dotY} r="13" fill="#ef2b2d" stroke="white" strokeWidth="4" />
        <text x="158" y={dotY + 5} fill="white" fontSize="12" fontWeight="800">YOUR SPOT</text>
      </svg>
    </article>
  );
};

const FieldDiagram = () => (
  <div className="front-back-diagrams">
    <FrontBackMiniField direction="front" />
    <FrontBackMiniField direction="behind" />
  </div>
);

const SideOrientationDiagram = () => (
  <div className="side-orientation-wrap">
    <svg
      className="side-orientation-field"
      viewBox="0 0 700 390"
      role="img"
      aria-labelledby="side-diagram-title side-diagram-description"
    >
      <title id="side-diagram-title">Left, right, Side 1, and Side 2 field orientation</title>
      <desc id="side-diagram-description">
        From the audience and director viewpoint, Side 1 is the left half and Side 2 is the right half.
        A performer facing the front sideline sees Side 1 on their right and Side 2 on their left.
      </desc>
      <defs>
        <linearGradient id="side-one-fill" x1="0" x2="1">
          <stop offset="0" stopColor="#ef2b2d" stopOpacity="0.24" />
          <stop offset="1" stopColor="#ef2b2d" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="side-two-fill" x1="0" x2="1">
          <stop offset="0" stopColor="#244cff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#244cff" stopOpacity="0.24" />
        </linearGradient>
      </defs>

      <rect x="22" y="38" width="656" height="272" rx="16" fill="#123c32" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <path d="M22 54 Q22 38 38 38 H350 V310 H38 Q22 310 22 294 Z" fill="url(#side-one-fill)" />
      <path d="M350 38 H662 Q678 38 678 54 V294 Q678 310 662 310 H350 Z" fill="url(#side-two-fill)" />

      <g stroke="rgba(255,255,255,0.38)" strokeWidth="2">
        <line x1="102" y1="38" x2="102" y2="310" />
        <line x1="184" y1="38" x2="184" y2="310" />
        <line x1="266" y1="38" x2="266" y2="310" />
        <line x1="350" y1="38" x2="350" y2="310" strokeWidth="4" />
        <line x1="434" y1="38" x2="434" y2="310" />
        <line x1="516" y1="38" x2="516" y2="310" />
        <line x1="598" y1="38" x2="598" y2="310" />
      </g>
      <g fill="rgba(255,255,255,0.72)" fontSize="16" fontWeight="700" textAnchor="middle">
        <text x="102" y="66">20</text>
        <text x="184" y="66">30</text>
        <text x="266" y="66">40</text>
        <text x="350" y="66">50</text>
        <text x="434" y="66">40</text>
        <text x="516" y="66">30</text>
        <text x="598" y="66">20</text>
      </g>
      <g stroke="rgba(255,255,255,0.48)" strokeWidth="4" strokeDasharray="10 13">
        <line x1="38" y1="128" x2="662" y2="128" />
        <line x1="38" y1="224" x2="662" y2="224" />
      </g>

      <g textAnchor="middle">
        <text x="184" y="115" fill="#fecaca" fontSize="31" fontWeight="900">SIDE 1</text>
        <text x="184" y="164" fill="white" fontSize="21" fontWeight="800">DRILLIO: LEFT</text>
        <text x="184" y="188" fill="rgba(255,255,255,0.72)" fontSize="16">Audience / director left</text>
        <text x="184" y="270" fill="#fee2e2" fontSize="17" fontWeight="700">Performer&apos;s RIGHT</text>
        <text x="184" y="291" fill="rgba(255,255,255,0.58)" fontSize="14">when facing front</text>

        <text x="516" y="115" fill="#bfdbfe" fontSize="31" fontWeight="900">SIDE 2</text>
        <text x="516" y="164" fill="white" fontSize="21" fontWeight="800">DRILLIO: RIGHT</text>
        <text x="516" y="188" fill="rgba(255,255,255,0.72)" fontSize="16">Audience / director right</text>
        <text x="516" y="270" fill="#dbeafe" fontSize="17" fontWeight="700">Performer&apos;s LEFT</text>
        <text x="516" y="291" fill="rgba(255,255,255,0.58)" fontSize="14">when facing front</text>
      </g>

      <text x="350" y="25" fill="rgba(255,255,255,0.58)" fontSize="14" fontWeight="700" textAnchor="middle">BACK / VISITOR SIDELINE</text>
      <line x1="350" y1="300" x2="350" y2="330" stroke="#f4ed00" strokeWidth="4" />
      <polygon points="350,342 340,326 360,326" fill="#f4ed00" />
      <text x="350" y="365" fill="white" fontSize="16" fontWeight="800" textAnchor="middle">FRONT / HOME SIDELINE</text>
      <text x="350" y="386" fill="rgba(255,255,255,0.58)" fontSize="13" textAnchor="middle">AUDIENCE + DIRECTOR</text>
    </svg>
    <div className="side-orientation-memory">
      <span><b>S1</b> Audience left · performer right</span>
      <span><b>S2</b> Audience right · performer left</span>
    </div>
  </div>
);

const HashTickDiagram = () => (
  <div className="hash-tick-guide">
    <h3>Line up each 8-to-5 step with the one-yard marks</h3>
    <p>
      Between two numbered yard lines, the sideline and hashes have four smaller marks—often called
      inserts or ticks. Your eight standard steps do not land directly on those marks; they create a
      repeatable before-and-after pattern.
    </p>
    <svg
      className="hash-tick-field"
      viewBox="0 0 700 330"
      role="img"
      aria-labelledby="hash-tick-title hash-tick-description"
    >
      <title id="hash-tick-title">How eight-to-five steps align with one-yard marks</title>
      <desc id="hash-tick-description">
        Seven foot positions show steps one through four inside the 40 yard line, then three through
        one outside the 45 yard line. Four vertical one-yard marks fall between those step positions.
      </desc>
      <rect x="18" y="18" width="664" height="294" rx="16" fill="#123c32" />
      <g fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="800" textAnchor="middle">
        <text x="220" y="48">STEPS INSIDE THE 40 →</text>
        <text x="480" y="48">← STEPS OUTSIDE THE 45</text>
      </g>
      <g stroke="rgba(255,255,255,0.9)" strokeWidth="7">
        <line x1="70" y1="66" x2="70" y2="274" />
        <line x1="630" y1="66" x2="630" y2="274" />
      </g>
      <g stroke="rgba(255,255,255,0.9)" strokeWidth="8">
        <line x1="182" y1="106" x2="182" y2="232" />
        <line x1="294" y1="106" x2="294" y2="232" />
        <line x1="406" y1="106" x2="406" y2="232" />
        <line x1="518" y1="106" x2="518" y2="232" />
      </g>
      <line x1="70" y1="232" x2="630" y2="232" stroke="rgba(255,255,255,0.6)" strokeWidth="5" />

      {[
        { x: 140, step: '1' },
        { x: 210, step: '2' },
        { x: 280, step: '3' },
        { x: 350, step: '4' },
        { x: 420, step: '3' },
        { x: 490, step: '2' },
        { x: 560, step: '1' }
      ].map(({ x, step }) => (
        <g key={x}>
          <ellipse cx={x - 8} cy="164" rx="9" ry="17" fill="#05060a" stroke="white" strokeWidth="2" transform={`rotate(10 ${x - 8} 164)`} />
          <ellipse cx={x + 8} cy="164" rx="9" ry="17" fill="#05060a" stroke="white" strokeWidth="2" transform={`rotate(-10 ${x + 8} 164)`} />
          <circle cx={x} cy="268" r="17" fill={step === '4' ? '#ef2b2d' : '#101117'} stroke={step === '4' ? '#f4ed00' : 'rgba(255,255,255,0.65)'} strokeWidth="3" />
          <text x={x} y="274" fill="white" fontSize="16" fontWeight="900" textAnchor="middle">{step}</text>
        </g>
      ))}

      <g fill="rgba(255,255,255,0.62)" fontSize="12" fontWeight="700" textAnchor="middle">
        <text x="182" y="92">1-YARD MARK</text>
        <text x="294" y="92">1-YARD MARK</text>
        <text x="406" y="92">1-YARD MARK</text>
        <text x="518" y="92">1-YARD MARK</text>
      </g>
      <g fill="white" fontWeight="900" textAnchor="middle">
        <text x="70" y="302" fontSize="18">40 YARD LINE</text>
        <text x="630" y="302" fontSize="18">45 YARD LINE</text>
        <text x="350" y="307" fill="#fff9a6" fontSize="14">4 = SPLIT / HALFWAY</text>
      </g>
    </svg>
    <div className="hash-tick-tips">
      <div><strong>Steps 1 and 2</strong><span>Fall just before and just after the first insert</span></div>
      <div><strong>Step 3</strong><span>Falls just before the second insert</span></div>
      <div><strong>Step 4</strong><span>Splits the two yard lines exactly halfway</span></div>
      <div><strong>Then mirror it</strong><span>Count 3, 2, 1 from the next yard line</span></div>
    </div>
    <p className="hash-tick-example">
      Use the inserts as <b>visual cues</b>, then project them front-to-back toward your dot. Remember:
      an insert is one yard apart, not one standard step apart.
    </p>
  </div>
);

const DotTypeDiagram = () => (
  <div className="dot-type-guide">
    <h3>What part of you goes on the dot?</h3>
    <div className="dot-type-grid">
      <article>
        <div className="dot-type-visual" aria-hidden="true">
          <span className="dot-facing-label">FRONT ↑</span>
          <span className="dot-foot dot-foot--left" data-label="LEFT FOOT" />
          <span className="dot-foot dot-foot--right" data-label="RIGHT FOOT" />
          <span className="dot-target dot-target--foot" />
        </div>
        <div className="dot-type-title">
          <h4>Foot dot</h4>
          <span>Default</span>
        </div>
        <p>
          The coordinate lands directly on the right foot. Place the right foot on the dot, with the
          left foot behind it, unless staff gives a different instruction.
        </p>
      </article>
      <article>
        <div className="dot-type-visual" aria-hidden="true">
          <span className="dot-facing-label">FRONT ↑</span>
          <span className="dot-foot dot-foot--left" data-label="LEFT FOOT" />
          <span className="dot-foot dot-foot--right" data-label="RIGHT FOOT" />
          <span className="dot-target dot-target--body" />
        </div>
        <h4>Body dot</h4>
        <p>
          The coordinate lands in the open space between your feet. The right foot stays completely
          in front of the spot and the left foot stays completely behind it.
        </p>
      </article>
    </div>
    <p className="dot-type-note">
      <strong>Foot dot is the Drillio default.</strong> Use the right foot unless staff identifies a
      different foot or calls for a body dot. Do not silently convert between the two conventions.
    </p>
  </div>
);

const CountTimeline = () => (
  <div className="count-timeline" aria-label="Eight count move from Set 12 to Set 13">
    <div className="count-set">SET 12</div>
    <div className="count-beats">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="count-beat" key={index + 1}>
          <span>{index + 1}</span>
          <small>{index === 0 ? 'step off' : index === 7 ? 'arrive' : ''}</small>
        </div>
      ))}
    </div>
    <div className="count-set count-set--destination">SET 13</div>
  </div>
);

const StepSizeExample = ({ label, steps, inches, tone }) => (
  <div className="step-size-example">
    <div className="step-size-heading">
      <span className={`step-size-dot step-size-dot--${tone}`} />
      <strong>{label}</strong>
      <span>{steps} steps across 5 yards · {inches}&quot; each</span>
    </div>
    <div className="step-size-track" aria-hidden="true">
      {Array.from({ length: steps }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  </div>
);

const LearningDrillPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen show-theme p-4">
      <main className="tutorial-page max-w-2xl mx-auto">
        <header className="tutorial-header pt-4 mb-6">
          <button onClick={() => navigate('/')} className="tutorial-home-button">
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>
          <div>
            <div className="show-kicker">Rookie guide</div>
            <h1>Learning Drill</h1>
          </div>
        </header>

        <section className="show-card tutorial-intro">
          <p className="tutorial-eyebrow">START HERE</p>
          <h2>Every set answers four questions</h2>
          <div className="tutorial-four-questions">
            <div><strong>Where?</strong><span>Your field coordinate</span></div>
            <div><strong>When?</strong><span>Your counts</span></div>
            <div><strong>How?</strong><span>Path and step size</span></div>
            <div><strong>What shape?</strong><span>Facing and form</span></div>
          </div>
          <p>
            Learn them in that order. Once your feet know the job, connect the move to your music.
          </p>
        </section>

        <section className="show-card tutorial-section">
          <div className="tutorial-section-heading">
            <span className="tutorial-section-number">01</span>
            <MapPin />
            <div>
              <p>POSITION</p>
              <h2>Find your spot with two coordinates</h2>
            </div>
          </div>
          <p>
            A drill coordinate is like an address. The first line places you left-to-right using a
            yard line. The second places you front-to-back using a hash or sideline. You need both
            before you have a complete spot.
          </p>

          <div className="coordinate-card">
            <span className="coordinate-label">LEFT–RIGHT</span>
            <strong>Left: 3.5 steps inside 40 yd ln</strong>
            <ol>
              <li><b>Left</b> means audience/director left: Side 1. Facing front, that is the performer&apos;s right.</li>
              <li>Find the <b>40 yard line</b>.</li>
              <li>If the coordinate says <b>On</b>, stand directly on the yard line with no inside or outside offset.</li>
              <li><b>Inside</b> means toward the 50. <b>Outside</b> means toward the nearest end zone.</li>
              <li>Move <b>3.5 standard steps</b> away from the line.</li>
            </ol>
          </div>

          <SideOrientationDiagram />

          <HashTickDiagram />

          <div className="coordinate-card coordinate-card--blue">
            <span className="coordinate-label">FRONT–BACK</span>
            <strong>7.5 steps in front of Visitor Hash</strong>
            <ol>
              <li>Find the short marks that make the <b>Visitor Hash</b>.</li>
              <li>If the coordinate says <b>On</b>, stand directly on the named hash or sideline with no front or behind offset.</li>
              <li><b>In front</b> means toward the front/home sideline and audience.</li>
              <li><b>Behind</b> means toward the back/visitor sideline.</li>
              <li>Move 7.5 steps perpendicular to the hash.</li>
            </ol>
          </div>

          <FieldDiagram />
          <div className="tutorial-callout">
            <Hash />
            <p>
              <strong>Quarter steps matter.</strong> A coordinate ending in .25, .5, or .75 is a
              precise location—not a suggestion. Start by learning what those fractions feel like.
            </p>
          </div>
        </section>

        <section className="show-card tutorial-section">
          <div className="tutorial-section-heading">
            <span className="tutorial-section-number">02</span>
            <Hash />
            <div>
              <p>TIME</p>
              <h2>Sets are pictures; counts connect them</h2>
            </div>
          </div>
          <p>
            A <b>set</b> is a frozen picture in the show. Counts tell you how much musical time you
            have to travel from one picture to the next. Counts are beats, not seconds—the tempo
            determines how quickly they pass.
          </p>
          <CountTimeline />
          <p>
            On a normal eight-count move, step off on count 1 and arrive on count 8 unless staff
            gives different instructions. In Drillio, the counts displayed with a destination set
            describe the transition from the previous set into that set.
          </p>
          <div className="tutorial-equation">
            <span>Hold 4</span><b>+</b><span>Move 8</span><b>+</b><span>Hold 4</span><b>=</b><strong>16 counts</strong>
          </div>
          <p className="tutorial-small-copy">
            Keep counting during holds. Your feet stop traveling, but time and performance do not stop.
          </p>
        </section>

        <section className="show-card tutorial-section">
          <div className="tutorial-section-heading">
            <span className="tutorial-section-number">03</span>
            <Ruler />
            <div>
              <p>STEP SIZE</p>
              <h2>“To the 5” tells you how large each step is</h2>
            </div>
          </div>
          <p>
            Yard lines are five yards apart. An <b>8-to-5</b> means eight equal steps cover that
            distance. A smaller first number means larger steps; a larger number means smaller steps.
          </p>
          <div className="tutorial-callout tutorial-callout--standard">
            <Ruler />
            <p>
              <strong>8-to-5 is the standard field step.</strong> All numeric coordinates in Drillio
              are measured in standard 8-to-5 steps, even when the move itself uses a different step size.
            </p>
          </div>
          <div className="step-size-list">
            <StepSizeExample label="6-to-5" steps={6} inches="30" tone="red" />
            <StepSizeExample label="8-to-5" steps={8} inches="22.5" tone="yellow" />
            <StepSizeExample label="12-to-5" steps={12} inches="15" tone="blue" />
          </div>
          <div className="tutorial-callout">
            <Ruler />
            <p>
              <strong>Keep every step equal.</strong> Do not take seven normal steps and one giant
              correction. Adjust early, maintain posture, and arrive centered on the final count.
            </p>
          </div>
        </section>

        <section className="show-card tutorial-section">
          <div className="tutorial-section-heading">
            <span className="tutorial-section-number">04</span>
            <Compass />
            <div>
              <p>PATH &amp; FACING</p>
              <h2>Your dot does not tell the whole story</h2>
            </div>
          </div>
          <div className="tutorial-two-column">
            <div>
              <h3>Pathway</h3>
              <p>
                Travel in the assigned direction—forward, backward, slide, crab, or a designed curve.
                Use a straight path between dots unless staff or the form tells you otherwise.
              </p>
            </div>
            <div>
              <h3>Facing</h3>
              <p>
                Facing is where your body points. It may be different from your direction of travel.
                Do not turn toward the destination unless that is part of the move.
              </p>
            </div>
          </div>
          <div className="tutorial-callout tutorial-callout--warning">
            <AlertTriangle />
            <p>
              <strong>Look up while moving.</strong> Learn the coordinate before the rep, then use
              peripheral vision to maintain spacing and avoid collisions. Never march while staring at your phone.
            </p>
          </div>
        </section>

        <section className="show-card tutorial-section">
          <div className="tutorial-section-heading">
            <span className="tutorial-section-number">05</span>
            <Users />
            <div>
              <p>FORM</p>
              <h2>Hit your dot, then dress the shape</h2>
            </div>
          </div>
          <p>
            Your coordinate is your individual responsibility. The form is the shared picture—line,
            arc, block, curve, or another shape. Once you are close to your dot, use the people around
            you to refine alignment and interval without dragging the whole form away from its coordinates.
          </p>
          <DotTypeDiagram />
          <ul className="tutorial-check-list">
            <li><CheckCircle2 />Know who you guide to and which direction the form should grow.</li>
            <li><CheckCircle2 />Match posture, horn or equipment angle, and feet timing.</li>
            <li><CheckCircle2 />Freeze on arrival so staff can read and correct the picture.</li>
          </ul>
        </section>

        <section className="show-card tutorial-section">
          <div className="tutorial-section-heading">
            <span className="tutorial-section-number">06</span>
            <ClipboardList />
            <div>
              <p>REHEARSAL COMMANDS</p>
              <h2>Understand what staff is asking for</h2>
            </div>
          </div>
          <p>
            During rehearsal, the drum major or director may call a range relative to the set being
            worked. A minus or plus indicates a marching count and step relative to the named set.
            <b> −1</b> is one step before the set, and <b>+1</b> is one step past it.
          </p>

          <div className="tutorial-callout">
            <ClipboardList />
            <p>
              <strong>We typically start at −1</strong>—one step before the set—so the rep includes
              the arrival into the coordinate being rehearsed.
            </p>
          </div>

          <div className="rehearsal-range-example">
            <div className="rehearsal-range-title">
              <span>EXAMPLE</span>
              <strong>“Set 20, start at −1 and go to Set 21 +1”</strong>
            </div>
            <div className="rehearsal-range-timeline">
              <div>
                <span>−1</span>
                <strong>Before Set 20</strong>
                <small>Start here</small>
              </div>
              <b>→</b>
              <div className="rehearsal-range-target">
                <span>SET</span>
                <strong>Set 20</strong>
              </div>
              <b>→</b>
              <div className="rehearsal-range-target">
                <span>SET</span>
                <strong>Set 21</strong>
              </div>
              <b>→</b>
              <div>
                <span>+1</span>
                <strong>Past Set 21</strong>
                <small>Finish here</small>
              </div>
            </div>
            <p>
              Start one count and step before Set 20, arrive at Set 20, continue through Set 21, then
              take one count and step past Set 21.
            </p>
          </div>

          <div className="rehearsal-command-grid">
            <article className="rehearsal-command-card rehearsal-command-card--fix">
              <span>FIX</span>
              <h3>Fix the form</h3>
              <p>
                Adjust the shared shape—line, arc, curve, block, interval, or dress—using the staff&apos;s
                instructions and your designated guides.
              </p>
            </article>
            <article className="rehearsal-command-card rehearsal-command-card--check">
              <span>CHECK</span>
              <h3>Check your dot</h3>
              <p>
                Return to your individual coordinate and verify the left–right and front–back measurements.
              </p>
            </article>
          </div>
        </section>

        <section className="show-card tutorial-section tutorial-final-section">
          <p className="tutorial-eyebrow">BEFORE EVERY REP</p>
          <h2>The rookie five-point check</h2>
          <ol className="tutorial-five-check">
            <li><span>1</span><div><strong>Dot</strong><p>Where is the destination coordinate?</p></div></li>
            <li><span>2</span><div><strong>Time</strong><p>How many counts, and are any held?</p></div></li>
            <li><span>3</span><div><strong>Travel</strong><p>What pathway and step size get you there?</p></div></li>
            <li><span>4</span><div><strong>Body</strong><p>What facing, posture, and form are required?</p></div></li>
            <li><span>5</span><div><strong>Music</strong><p>What phrase or cue happens during the move?</p></div></li>
          </ol>
          <p className="tutorial-finish-copy">
            You do not need to learn everything at once. Build one correct layer at a time, ask questions
            early, and repeat it until the coordinate feels familiar without looking down.
          </p>
        </section>

        <div className="tutorial-finish-actions">
          <button onClick={() => navigate('/coordinate-practice')} className="show-primary-button tutorial-practice-button">
            <Crosshair />
            <span>Practice Finding Coordinates</span>
          </button>
          <button onClick={() => navigate('/')} className="tutorial-back-button">
            Back to Drillio
          </button>
        </div>
      </main>
    </div>
  );
};

export default LearningDrillPage;
