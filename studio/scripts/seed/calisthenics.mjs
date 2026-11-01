/**
 * Calisthenics sample content (prompts/seed-calisthenics-content.md).
 *
 *   node scripts/seed/calisthenics.mjs pick    # find a real, embeddable video per lesson → calisthenics-videos.json
 *   node scripts/seed/calisthenics.mjs build   # write calisthenics.ndjson from the spec + picked videos
 *   npx sanity dataset import scripts/seed/calisthenics.ndjson <dataset> --replace
 *
 * Offline tooling only (AGENTS §5). Picks are cached: re-running `pick` only searches lessons
 * without a video, or a lesson whose entry you delete from calisthenics-videos.json. Ids are
 * deterministic, so a re-import replaces exactly these documents.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const VIDEOS = join(here, 'calisthenics-videos.json')
const OUT = join(here, 'calisthenics.ndjson')

/* ---------------------------------------------------------------- Spec */

const categories = [
  {slug: 'calisthenics', title: 'Calisthenics', description: 'Bodyweight strength from the ground up: pushing, pulling, squatting, and the core control that ties them together.'},
  {slug: 'mobility-flexibility', title: 'Mobility & Flexibility', description: 'Joint preparation, stretching, and usable range of motion so training stays pain-free and skills unlock sooner.'},
  {slug: 'gymnastic-skills', title: 'Gymnastic Skills', description: 'Balance and strength skills such as handstands, muscle-ups, and levers, built through structured progressions.'},
  {slug: 'conditioning', title: 'Conditioning', description: 'Bodyweight work capacity: circuits, intervals, and the programming and recovery that let you train hard week after week.'},
]

const instructors = [
  {
    slug: 'diego-ramos', name: 'Diego Ramos', photo: 'men/32',
    expertise: ['Calisthenics', 'Pull-ups', 'Push-ups', 'Beginner strength', 'Leg training'],
    bio: [
      'Diego started training in a park with a single pull-up bar and has coached hundreds of complete beginners to their first strict pull-up. He believes every hard movement is just an easy one, progressed patiently.',
      'His sessions are built around clean form and small, repeatable wins: fewer reps done well beat more reps done badly.',
    ],
  },
  {
    slug: 'hana-lindqvist', name: 'Hana Lindqvist', photo: 'women/68',
    expertise: ['Mobility', 'Flexibility', 'Joint prep', 'Injury prevention'],
    bio: [
      'Hana is a mobility coach who spent years in dance before moving into strength training. She helps athletes gain the range of motion their skills demand without forcing it.',
      'Her approach is simple: warm the joint, load it gently through range, and practice often. Ten minutes a day beats an hour once a week.',
    ],
  },
  {
    slug: 'mateo-silva', name: 'Mateo Silva', photo: 'men/75',
    expertise: ['Handstands', 'Muscle-ups', 'Front lever', 'Gymnastic strength'],
    bio: [
      'Mateo competed in street workout before turning to coaching gymnastic skills. He breaks impressive moves into progressions anyone with patience can follow.',
      'He cares about positions first: a straight line, active shoulders, and tension you can feel. Strength and balance follow good shapes.',
    ],
  },
  {
    slug: 'aisha-bello', name: 'Aisha Bello', photo: 'women/23',
    expertise: ['Conditioning', 'HIIT', 'Programming', 'Recovery'],
    bio: [
      'Aisha coaches conditioning for athletes who train with their bodyweight. She designs workouts that build real work capacity without leaving people wrecked.',
      'She is just as serious about recovery and programming as about the workouts themselves, because consistency is what produces results.',
    ],
  },
]

// lesson: [topicSlug, title, summary, query, keyPoints[3], proTip]
const courses = [
  {
    slug: 'calisthenics-foundations-first-pull-up', title: 'Calisthenics Foundations: Your First Pull-Up',
    summary: 'Build real bodyweight strength from zero: warm up properly, master push-up and dip progressions, and work step by step to your first strict pull-up.',
    level: 'beginner', category: 'calisthenics', instructor: 'diego-ramos', price: 0, popular: true, students: 12840,
    outcomes: [
      ['shield', 'Train with good form', 'Warm up properly and keep your joints safe as the work gets harder.'],
      ['layers', 'Progress every movement', 'Use regressions and progressions so every exercise matches your current strength.'],
      ['rocket', 'Earn your first pull-up', 'Follow a proven path from dead hangs to strict pull-ups.'],
    ],
    modules: [
      {title: 'Movement prep and form', summary: 'Warm up the body and learn the positions every calisthenics exercise is built on.', lessons: [
        ['warm-up', 'A full-body calisthenics warm-up', 'A short routine that prepares wrists, shoulders, and hips before every session.', 'calisthenics warm up routine before workout', ['Raise your temperature before loading joints', 'Prepare wrists and shoulders specifically', 'Keep the warm-up under ten minutes'], 'If a joint feels stiff, give it one extra set of the warm-up drill instead of skipping it.'],
        ['hollow-body', 'The hollow body position', 'The core position behind push-ups, pull-ups, and handstands.', 'hollow body hold tutorial calisthenics', ['Press the lower back into the floor', 'Shorten the lever to make it easier', 'Hold quality, not time'], 'Film yourself from the side: a lifted lower back means the hold is too hard for now.'],
        ['scapula-control', 'Scapula control: protraction and retraction', 'Learn to move the shoulder blades, the base of every push and pull.', 'scapular push ups and scapular pull ups tutorial', ['Feel protraction and retraction separately', 'Keep the elbows straight during scap work', 'Use scap reps as activation before training'], 'Slow the scap reps down: if you cannot pause at the end range you are using momentum.'],
      ]},
      {title: 'Push fundamentals', summary: 'From incline push-ups to dips: the pushing progressions that build chest, shoulders, and triceps.', lessons: [
        ['first-push-up', 'Your first full push-up', 'Incline and knee progressions that lead to clean full push-ups.', 'how to get your first push up beginner progression', ['Use an incline to reduce load', 'Keep a straight line from head to heels', 'Add reps before lowering the incline'], 'Lower slowly for three seconds: the eccentric builds strength faster than rushed reps.'],
        ['push-up-form', 'Perfect push-up form', 'Hand position, elbow angle, and body line for strong, joint-friendly push-ups.', 'perfect push up form common mistakes', ['Stack wrists under shoulders', 'Tuck elbows about 45 degrees', 'Lock out with a scap push at the top'], 'Squeeze your glutes during every rep; it keeps the hips from sagging.'],
        ['dips-intro', 'Dips: bench to parallel bars', 'Start dipping safely with bench dips and progress to parallel bars.', 'dips progression for beginners calisthenics', ['Start with bench or assisted dips', 'Lower only as far as your shoulders allow', 'Lean slightly forward on parallel bars'], 'Stop each rep just before your shoulders roll forward; depth comes with time.'],
      ]},
      {title: 'Pull fundamentals', summary: 'Grip, rows, and negatives: the steps that turn a dead hang into a strict pull-up.', lessons: [
        ['dead-hang', 'Dead hangs and active hangs', 'Build grip and shoulder strength with passive and active hanging.', 'dead hang vs active hang pull up beginner', ['Start with short, frequent hangs', 'Learn the active hang shoulder position', 'Build toward 30 to 60 seconds'], 'Hang at the end of every session; grip strength adds up quickly.'],
        ['australian-rows', 'Australian rows', 'Horizontal rows that build pulling strength for pull-ups.', 'australian rows inverted rows tutorial', ['Keep the body rigid like a plank', 'Pull the chest to the bar', 'Walk the feet forward to make it harder'], 'Pause one second at the top of each row to make sure your back is doing the work.'],
        ['negative-pull-ups', 'Negative pull-ups to your first rep', 'Controlled lowering and a simple plan to earn the first strict pull-up.', 'how to do your first pull up negatives progression', ['Jump or step to the top position', 'Lower over three to five seconds', 'Test a strict rep every week'], 'Stop the negative set when you can no longer control the bottom third of the descent.'],
      ]},
    ],
  },
  {
    slug: 'bodyweight-legs-and-core', title: 'Bodyweight Legs and Core',
    summary: 'Strong legs and a solid core without a gym: squat patterns, single-leg strength up to the pistol squat, and core work that carries into every skill.',
    level: 'beginner', category: 'calisthenics', instructor: 'diego-ramos', price: 29, popular: false, students: 6430,
    outcomes: [
      ['gauge', 'Squat with control', 'Own the bodyweight squat pattern, depth, and tempo.'],
      ['rocket', 'Build single-leg strength', 'Progress lunges and split squats toward the pistol squat.'],
      ['shield', 'Develop a strong core', 'Use planks, leg raises, and L-sit work to stabilise every movement.'],
    ],
    modules: [
      {title: 'Squat patterns', summary: 'Master the bodyweight squat before adding difficulty.', lessons: [
        ['bodyweight-squat', 'The bodyweight squat', 'Depth, knee tracking, and balance for a clean air squat.', 'bodyweight squat proper form tutorial', ['Keep the whole foot on the floor', 'Push the knees out over the toes', 'Sit between your hips, not behind them'], 'Hold the bottom of the squat for 30 seconds daily to build comfortable depth.'],
        ['jump-squats', 'Jump squats and power', 'Add explosiveness to your squat safely.', 'jump squat tutorial how to do jump squats', ['Land softly through the whole foot', 'Reset between reps at first', 'Quality jumps over high volume'], 'Count your landings out loud; quiet landings mean good control.'],
        ['wall-sit', 'Isometric squat holds', 'Wall sits and paused squats for strength and endurance.', 'how to do a wall sit correctly tutorial', ['Thighs parallel to the floor', 'Back flat against the wall', 'Progress time in small steps'], 'Add a five-second pause at the bottom of regular squats to build the same strength.'],
      ]},
      {title: 'Single-leg strength', summary: 'Lunges, split squats, and the road to the pistol squat.', lessons: [
        ['lunges', 'Lunges done right', 'Forward, reverse, and walking lunges with stable knees.', 'how to do lunges correctly form tutorial', ['Take a long enough stride', 'Keep the front knee stable', 'Drive through the front heel'], 'Reverse lunges are kinder to the knees than forward lunges; start there.'],
        ['bulgarian-split-squat', 'Bulgarian split squats', 'The single-leg exercise that builds strength for pistols.', 'bulgarian split squat proper form', ['Set the back foot on a bench', 'Keep most of the weight on the front leg', 'Control the descent'], 'Find your stance once, then mark it on the floor so every set starts the same way.'],
        ['pistol-squat', 'Pistol squat progressions', 'Box pistols and assisted pistols toward a full pistol squat.', 'pistol squat progression for beginners', ['Start with box or assisted pistols', 'Keep the heel down', 'Use a counterweight for balance'], 'Hold a light weight out in front; it makes balance easier while you build strength.'],
      ]},
      {title: 'Core and hollow body', summary: 'Core strength that transfers to every calisthenics skill.', lessons: [
        ['plank', 'Planks with full-body tension', 'Turn the plank into a real strength exercise.', 'how to do a plank correctly full body tension', ['Squeeze glutes and quads', 'Push the floor away', 'Shorter, harder holds beat long, sloppy ones'], 'Try a 20-second plank at maximum tension; it is harder than two relaxed minutes.'],
        ['leg-raises', 'Hanging and lying leg raises', 'Lower-ab strength from lying to hanging leg raises.', 'hanging leg raises progression tutorial', ['Start lying, then progress to hanging', 'Avoid swinging', 'Posteriorly tilt the pelvis at the top'], 'Exhale fully as the legs rise; it helps the abs engage harder.'],
        ['l-sit', 'L-sit progressions', 'Tuck sits to full L-sits on the floor or parallettes.', 'l sit progression tutorial beginner', ['Start with tuck holds', 'Push the shoulders down hard', 'Practice short holds often'], 'Use parallettes or yoga blocks: the extra height makes the first holds possible.'],
      ]},
    ],
  },
  {
    slug: 'mobility-for-calisthenics', title: 'Mobility for Calisthenics',
    summary: 'Unlock the range of motion your training needs: healthy wrists and shoulders, open hips and hamstrings, and a supple spine for bridges and skills.',
    level: 'beginner', category: 'mobility-flexibility', instructor: 'hana-lindqvist', price: 19, popular: false, students: 8915,
    outcomes: [
      ['shield', 'Bulletproof your wrists and shoulders', 'Prepare the joints that take the most load in calisthenics.'],
      ['layers', 'Open hips and hamstrings', 'Build pike and pancake flexibility with active stretching.'],
      ['sparkles', 'Move your spine freely', 'Improve thoracic mobility and work toward a full bridge.'],
    ],
    modules: [
      {title: 'Wrists and shoulders', summary: 'Prepare the joints that carry your bodyweight.', lessons: [
        ['wrist-prep', 'Wrist mobility routine', 'A daily routine for strong, pain-free wrists in push-ups and handstands.', 'wrist mobility routine for calisthenics handstand', ['Move the wrist in every direction', 'Load gradually on hands and knees', 'Do it before every pushing session'], 'Two minutes of wrist prep prevents weeks of wrist pain later.'],
        ['shoulder-mobility', 'Shoulder mobility for overhead strength', 'Improve overhead range for handstands and pressing.', 'shoulder mobility routine overhead flexibility', ['Open the chest and lats', 'Use active end-range holds', 'Keep the ribs down overhead'], 'Test your overhead range against a wall before and after the routine to see what works for you.'],
        ['shoulder-dislocates', 'Band shoulder dislocates', 'A simple band drill for healthy shoulder rotation.', 'shoulder dislocates with band how to', ['Start with a wide grip', 'Move slowly through the full circle', 'Narrow the grip over weeks'], 'If one arm lags behind, your grip is too narrow; widen it.'],
      ]},
      {title: 'Hips and hamstrings', summary: 'Flexibility for pikes, L-sits, and pain-free squats.', lessons: [
        ['hip-flexor-stretch', 'Hip flexor and hip opener routine', 'Release tight hips from sitting and prepare for deep squats.', 'hip mobility routine hip flexor stretch', ['Tuck the pelvis in the lunge stretch', 'Breathe into end range', 'Work both sides evenly'], 'Squeeze the glute of the back leg; the stretch on the hip flexor gets much stronger.'],
        ['pike-flexibility', 'Pike flexibility', 'Seated and standing pike work for toe touches and compression.', 'pike flexibility routine hamstring stretch', ['Hinge from the hips, not the back', 'Use active compression', 'Stretch warm, never cold'], 'Lift your toes during the stretch to feel the hamstrings work instead of just hang.'],
        ['pancake-stretch', 'Pancake stretch progressions', 'Open the straddle for pancakes and press handstands.', 'pancake stretch progression straddle', ['Keep a long spine', 'Rotate the knees up', 'Use breathing to sink deeper'], 'Sit on a folded towel to tilt the pelvis forward; it helps you fold from the hips.'],
      ]},
      {title: 'Spine and bridge', summary: 'Thoracic mobility and the full bridge.', lessons: [
        ['thoracic-mobility', 'Thoracic spine mobility', 'Free the upper back for better overhead position and posture.', 'thoracic spine mobility exercises', ['Rotate through the upper back', 'Use the floor or a foam roller', 'Combine with breathing'], 'Do these drills after a long day at a desk; they undo most of the stiffness.'],
        ['cat-cow-flow', 'Spinal flow: cat-cow and beyond', 'Gentle flowing movements for a healthy, mobile spine.', 'spine mobility routine cat cow flow', ['Move one segment at a time', 'Keep the breath slow', 'Use it as a warm-up or cool-down'], 'Close your eyes during the flow; it makes you feel each segment move.'],
        ['bridge-progression', 'Bridge progressions', 'From glute bridges to a full back bridge.', 'bridge progression backbend tutorial beginner', ['Open the shoulders first', 'Push the chest over the hands', 'Straighten the arms gradually'], 'Practice bridges early in the session when you are warm but not tired.'],
      ]},
    ],
  },
  {
    slug: 'handstand-mastery', title: 'Handstand Mastery',
    summary: 'Learn the handstand step by step: wall drills for line and strength, kick-ups and balance for the freestanding hold, and the path to handstand push-ups.',
    level: 'intermediate', category: 'gymnastic-skills', instructor: 'mateo-silva', price: 49, popular: true, students: 10372,
    outcomes: [
      ['layers', 'Build a straight handstand line', 'Stack hands, shoulders, and hips with the right tension.'],
      ['gauge', 'Balance freestanding', 'Use your fingers and wrists to hold the handstand without the wall.'],
      ['rocket', 'Press upside down', 'Progress pike push-ups toward the handstand push-up.'],
    ],
    modules: [
      {title: 'Wall handstand', summary: 'Use the wall to build line, strength, and confidence.', lessons: [
        ['wall-walks', 'Wall walks', 'Walk up the wall to build strength and comfort upside down.', 'wall walk handstand drill tutorial', ['Walk the hands close to the wall', 'Keep the core tight', 'Walk down as slowly as you walked up'], 'Do wall walks at the start of a session when your shoulders are fresh.'],
        ['chest-to-wall', 'Chest-to-wall handstand', 'The best drill for a straight handstand line.', 'chest to wall handstand hold tutorial', ['Stack hands under shoulders', 'Push tall through the shoulders', 'Point the toes and squeeze the legs'], 'Reduce the distance between hands and wall over time until your nose nearly touches it.'],
        ['handstand-line', 'The perfect handstand line', 'Shoulder elevation, rib position, and body tension upside down.', 'handstand body line alignment explained', ['Elevate the shoulders fully', 'Pull the ribs in', 'Keep the glutes and legs tight'], 'Film from the side and draw a line through wrists, shoulders, and hips; it should be straight.'],
      ]},
      {title: 'Kick-up and balance', summary: 'Get up consistently and learn to balance away from the wall.', lessons: [
        ['kick-up', 'Kicking up to handstand', 'A consistent, controlled kick-up instead of a wild swing.', 'how to kick up into handstand tutorial', ['Start from a lunge with arms overhead', 'Kick with control, not force', 'Bring the legs together at the top'], 'Count how many kick-ups land in balance out of ten; track that number each week.'],
        ['finger-balance', 'Balancing with your fingers', 'Use finger and palm pressure to correct your balance.', 'handstand balance fingers wrist control', ['Press the fingertips to stop overbalancing', 'Shift weight into the palms to recover underbalance', 'Make corrections small and early'], 'Practice heel pulls from the wall to feel the finger pressure that saves a falling handstand.'],
        ['bail-out', 'Bailing out safely', 'The cartwheel bail so falling stops being scary.', 'how to bail out of a handstand safely cartwheel', ['Turn a hand and step out to the side', 'Practice bails before freestanding work', 'Fall on purpose until it is automatic'], 'Practice the bail on both sides; you will not always fall the way you expect.'],
      ]},
      {title: 'Handstand push-up path', summary: 'Build pressing strength from pike push-ups to handstand push-ups.', lessons: [
        ['pike-push-up', 'Pike push-ups', 'The first overhead pressing exercise in calisthenics.', 'pike push up tutorial proper form', ['Hips high over the shoulders', 'Lower the head in front of the hands', 'Elevate the feet to progress'], 'Make a triangle with your head and hands at the bottom; it protects the shoulders.'],
        ['elevated-pike', 'Elevated pike push-ups', 'Raise the feet to load the shoulders more.', 'elevated pike push up progression', ['Put the feet on a box or bench', 'Keep the hips stacked over shoulders', 'Add height gradually'], 'When ten clean reps feel easy, raise the feet another step.'],
        ['handstand-push-up', 'Wall handstand push-ups', 'Your first handstand push-ups against the wall.', 'handstand push up progression tutorial wall', ['Start with negatives', 'Use partial range first', 'Lower under control every rep'], 'Put a folded mat under your head to shorten the range while you build strength.'],
      ]},
    ],
  },
  {
    slug: 'muscle-up-and-front-lever', title: 'Muscle-Up and Front Lever',
    summary: 'Advanced pulling for experienced athletes: explosive pull-ups, the muscle-up transition, and front lever progressions from tuck to full.',
    level: 'advanced', category: 'gymnastic-skills', instructor: 'mateo-silva', price: 69, popular: false, students: 5208,
    outcomes: [
      ['rocket', 'Pull explosively', 'Develop high, fast pull-ups that make the muscle-up possible.'],
      ['workflow', 'Master the transition', 'Learn the false grip, kipping, and the turnover over the bar.'],
      ['gauge', 'Hold a front lever', 'Progress from tuck to straddle to full front lever.'],
    ],
    modules: [
      {title: 'Explosive pulling', summary: 'Build the height and speed the muscle-up needs.', lessons: [
        ['explosive-pull-ups', 'Explosive pull-ups', 'Pull as high and as fast as possible.', 'explosive pull ups for muscle up', ['Start each rep from a dead hang', 'Pull the bar to the lower chest', 'Rest fully between reps'], 'Aim to touch the bar with your chest or belly; that height is what the muscle-up needs.'],
        ['high-pull-ups', 'Chest-to-bar and high pull-ups', 'Train the extra range above the chin.', 'chest to bar pull up tutorial', ['Lean back slightly at the top', 'Drive the elbows down and back', 'Control the descent'], 'Film your top position: your chin should be well above the bar, not just at it.'],
        ['weighted-pull-ups', 'Weighted pull-ups for strength', 'Add load to build raw pulling strength.', 'weighted pull ups for beginners tutorial', ['Start with light weight', 'Keep strict form', 'Use low reps and full rest'], 'Add weight only after you can do ten strict bodyweight pull-ups.'],
      ]},
      {title: 'The muscle-up transition', summary: 'Grip, swing, and the turnover over the bar.', lessons: [
        ['false-grip', 'The false grip', 'A grip that makes the transition easier.', 'false grip muscle up tutorial', ['Rest the bar on the wrist, not the fingers', 'Build up with false-grip hangs', 'Use chalk'], 'Start with false-grip hangs on a low bar where your feet can take some weight.'],
        ['kipping-swing', 'The swing and kip', 'Use a controlled swing to generate momentum.', 'muscle up kip swing technique tutorial', ['Keep the swing small and tight', 'Time the pull at the back swing', 'Pull the hips toward the bar'], 'Practice the swing by itself before adding the pull; timing matters more than strength.'],
        ['muscle-up', 'Your first muscle-up', 'Put it all together and get over the bar.', 'how to do your first muscle up tutorial', ['Pull high and fast', 'Lean the chest over the bar quickly', 'Finish with a straight-bar dip'], 'Practice the transition on a low bar with your feet assisting until the movement feels natural.'],
      ]},
      {title: 'Front lever progressions', summary: 'Straight-arm pulling from tuck to full lever.', lessons: [
        ['tuck-front-lever', 'Tuck front lever', 'The first front lever position.', 'tuck front lever tutorial', ['Keep the arms locked straight', 'Depress the shoulders', 'Keep the back flat'], 'Do short holds of five to ten seconds; long sloppy holds teach the wrong position.'],
        ['advanced-tuck', 'Advanced tuck and straddle', 'Open the hips to lengthen the lever.', 'advanced tuck front lever straddle progression', ['Open the hips slowly', 'Keep the body parallel to the floor', 'Use bands for assistance'], 'Try a band under the hips to feel the longer position before you can hold it alone.'],
        ['full-front-lever', 'Full front lever training', 'Hold and build strength in the full front lever.', 'front lever full progression training tips', ['Train negatives and raises', 'Squeeze the legs together', 'Keep shoulders depressed'], 'Front lever raises from an inverted hang build strength through the whole range.'],
      ]},
    ],
  },
  {
    slug: 'calisthenics-conditioning', title: 'Calisthenics Conditioning',
    summary: 'Build bodyweight work capacity: circuits and intervals that boost endurance, plus the recovery and programming that keep you training consistently.',
    level: 'intermediate', category: 'conditioning', instructor: 'aisha-bello', price: 39, popular: false, students: 7120,
    outcomes: [
      ['gauge', 'Build work capacity', 'Train longer and harder with bodyweight circuits.'],
      ['rocket', 'Run effective HIIT', 'Structure intervals for conditioning without equipment.'],
      ['workflow', 'Program and recover', 'Plan weekly training and recover well between sessions.'],
    ],
    modules: [
      {title: 'Work capacity', summary: 'Circuits that build endurance with bodyweight.', lessons: [
        ['burpees', 'Burpees done right', 'Efficient technique for the classic conditioning exercise.', 'how to do a burpee proper form', ['Keep the movement fluid', 'Land softly from the jump', 'Breathe in a steady rhythm'], 'Pace burpees by sets of five with a fixed rest; you will do more total reps.'],
        ['bodyweight-circuit', 'Full-body bodyweight circuit', 'A complete circuit you can do anywhere.', 'full body bodyweight circuit workout no equipment', ['Alternate upper and lower body', 'Keep rest short between exercises', 'Repeat the circuit three to five times'], 'Write your rounds and reps down; beating last week is the whole game.'],
        ['mountain-climbers', 'Mountain climbers and core conditioning', 'Fast core work that raises the heart rate.', 'mountain climbers proper form tutorial', ['Keep the hips low', 'Drive the knees under the chest', 'Stay on the balls of the feet'], 'Slow mountain climbers with a long pause build the core; fast ones build conditioning.'],
      ]},
      {title: 'Bodyweight HIIT', summary: 'Interval formats for maximum conditioning in minimal time.', lessons: [
        ['tabata', 'Tabata intervals', 'Twenty seconds on, ten seconds off, for four minutes.', 'tabata workout bodyweight explained', ['Work at a high but repeatable effort', 'Pick simple exercises', 'Respect the exact timing'], 'Choose movements you cannot do badly when tired, such as squats or mountain climbers.'],
        ['emom', 'EMOM workouts', 'Every-minute-on-the-minute training for steady pacing.', 'emom workout explained bodyweight', ['Do the reps at the start of each minute', 'Rest for the remainder', 'Pick reps you can repeat every round'], 'If you are not finishing the reps within 40 seconds, lower the rep target.'],
        ['hiit-workout', 'A 15-minute bodyweight HIIT', 'A follow-along conditioning workout.', '15 minute bodyweight hiit workout follow along', ['Warm up first', 'Push hard in each interval', 'Cool down after'], 'Do this workout on a different day from your hardest strength session.'],
      ]},
      {title: 'Recovery and programming', summary: 'Plan your week and recover so progress continues.', lessons: [
        ['weekly-plan', 'Programming your calisthenics week', 'Balance strength, skills, and conditioning across the week.', 'calisthenics workout program for beginners weekly', ['Train each pattern two to three times a week', 'Separate hard sessions', 'Progress one variable at a time'], 'Plan your week on Sunday; a written plan beats deciding what to do in the moment.'],
        ['recovery', 'Recovery between sessions', 'Sleep, nutrition, and active recovery for steady progress.', 'how to recover faster between workouts sleep protein rest days', ['Prioritise sleep', 'Eat enough protein', 'Use light movement on rest days'], 'Track your morning energy; two bad days in a row means you need extra rest.'],
        ['cool-down-stretch', 'Cool-down stretching routine', 'A short routine to finish every session.', 'post workout cool down stretching routine', ['Lower the heart rate gradually', 'Stretch the muscles you trained', 'Breathe slowly and deeply'], 'Keep the cool-down to five or ten minutes so you actually do it every time.'],
      ]},
    ],
  },
]

/* ---------------------------------------------------------------- pick */

// The consent cookie skips the EU cookie-consent redirect, which otherwise loops.
const UA = {'user-agent': 'Mozilla/5.0', 'accept-language': 'en-US,en', cookie: 'CONSENT=YES+1; SOCS=CAI'}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query) {
  // sp=EgIQAQ%3D%3D filters to videos
  const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D&hl=en`, {headers: UA})
  const html = await res.text()
  const json = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)?.[1]
  if (!json) return []
  const out = []
  const walk = (o) => {
    if (!o || typeof o !== 'object') return
    if (o.videoRenderer) {
      const v = o.videoRenderer
      const len = v.lengthText?.simpleText
      if (len) {
        const seconds = len.split(':').map(Number).reduce((a, b) => a * 60 + b, 0)
        out.push({id: v.videoId, title: v.title?.runs?.[0]?.text ?? '', channel: v.ownerText?.runs?.[0]?.text ?? '', duration: seconds})
      }
    }
    for (const k in o) walk(o[k])
  }
  walk(JSON.parse(json))
  return out
}

/** Embeddable (playable on the lesson page) if YouTube's public oEmbed answers 200. */
async function embeddable(id) {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, {headers: UA})
  return res.ok
}

async function pick() {
  const videos = existsSync(VIDEOS) ? JSON.parse(readFileSync(VIDEOS, 'utf8')) : {}
  const used = new Set(Object.values(videos).map((v) => v.id))
  for (const course of courses) {
    for (const mod of course.modules) {
      for (const [topic, title, , query] of mod.lessons) {
        const key = `${course.slug}-${topic}`
        if (videos[key]) continue
        let results = []
        // YouTube throttles bursts: retry with a growing pause before giving up on this lesson.
        for (let attempt = 1; attempt <= 3 && results.length === 0; attempt++) {
          try {
            results = await search(query)
          } catch (error) {
            if (attempt === 3) console.log(`SEARCH FAILED  ${key}  (${error.message}); re-run pick to retry`)
            else await sleep(15000 * attempt)
          }
        }
        if (results.length === 0) continue
        let chosen = null
        for (const r of results) {
          if (used.has(r.id) || r.duration < 120 || r.duration > 1200) continue
          if (await embeddable(r.id).catch(() => false)) { chosen = r; break }
        }
        if (!chosen) { console.log(`NO PICK  ${key}  (${query})`); continue }
        used.add(chosen.id)
        videos[key] = {...chosen, query}
        console.log(`${key.padEnd(62)} ${chosen.id}  ${Math.round(chosen.duration / 60)}m  ${chosen.channel} | ${chosen.title}`)
        writeFileSync(VIDEOS, JSON.stringify(videos, null, 2) + '\n')
        await sleep(2500)
      }
    }
  }
}

/* ---------------------------------------------------------------- build */

const slug = (current) => ({_type: 'slug', current})
const ref = (_ref) => ({_type: 'reference', _ref})
const image = (url, alt) => ({_type: 'image', _sanityAsset: `image@${url}`, alt})
const block = (key, text, style = 'normal') => ({_type: 'block', _key: key, style, markDefs: [], children: [{_type: 'span', _key: `${key}-span`, text, marks: []}]})

function build() {
  const videos = JSON.parse(readFileSync(VIDEOS, 'utf8'))
  const docs = []

  for (const c of categories) {
    docs.push({_id: `category.${c.slug}`, _type: 'category', title: c.title, slug: slug(c.slug), description: c.description})
  }
  for (const i of instructors) {
    docs.push({
      _id: `instructor.${i.slug}`, _type: 'instructor', name: i.name, slug: slug(i.slug),
      photo: image(`https://randomuser.me/api/portraits/${i.photo}.jpg`, `Portrait of ${i.name}`),
      expertise: i.expertise,
      bio: i.bio.map((text, n) => block(`${i.slug}-bio-${n}`, text)),
    })
  }

  for (const c of courses) {
    let first = null
    const modules = c.modules.map((mod, m) => {
      const lessonRefs = mod.lessons.map(([topic, title, summary, , keyPoints, proTip], l) => {
        const key = `${c.slug}-${topic}`
        const video = videos[key]
        if (!video) throw new Error(`No video picked for ${key}; run "pick" first`)
        first ??= video
        docs.push({
          _id: `lesson.${key}`, _type: 'lesson', title, slug: slug(key), summary,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
          thumbnail: image(`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`, `Video thumbnail for ${title}`),
          duration: video.duration,
          freePreview: m === 0 && l === 0,
          studentCount: Math.max(0, Math.round(c.students * (1 - (m * 3 + l) * 0.06))),
          notes: [
            block(`${key}-intro`, summary),
            block(`${key}-h2`, 'What this lesson covers', 'h2'),
            ...keyPoints.map((point, n) => block(`${key}-point-${n}`, `${point}.`)),
          ],
          keyPoints,
          proTip,
        })
        return {_type: 'reference', _ref: `lesson.${key}`, _key: `${topic}`}
      })
      return {_type: 'module', _key: `${c.slug}-module-${m}`, title: mod.title, summary: mod.summary, lessons: lessonRefs}
    })

    docs.push({
      _id: `course.${c.slug}`, _type: 'course', title: c.title, slug: slug(c.slug), summary: c.summary,
      coverImage: image(`https://i.ytimg.com/vi/${first.id}/hqdefault.jpg`, `Cover image for ${c.title}`),
      instructor: ref(`instructor.${c.instructor}`), category: ref(`category.${c.category}`),
      level: c.level, price: c.price, popular: c.popular, studentCount: c.students,
      learningOutcomes: c.outcomes.map(([icon, title, description], n) => ({_type: 'learningOutcome', _key: `${c.slug}-outcome-${n}`, icon, title, description})),
      modules,
    })
  }

  writeFileSync(OUT, docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
  const count = (t) => docs.filter((d) => d._type === t).length
  console.log(`Wrote ${docs.length} docs: ${count('category')} categories, ${count('instructor')} instructors, ${count('course')} courses, ${count('lesson')} lessons → ${OUT}`)
}

const step = process.argv[2]
if (step === 'pick') await pick()
else if (step === 'build') build()
else console.log('Usage: node scripts/seed/calisthenics.mjs pick|build')
