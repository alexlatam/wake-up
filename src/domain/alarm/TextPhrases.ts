import type { TypeTextLevel } from './Action';

const PHRASES: Record<TypeTextLevel, string[]> = {
  // Easy: one sentence, max 10 words
  EASY: [
    'The sun is shining today.',
    'I am ready to wake up.',
    'Good morning, a new day begins.',
    'Time to rise and shine.',
    'A new day has begun.',
    'Open your eyes and breathe.',
    'Get up and start moving.',
    'Today is going to be great.',
    'Wake up and be awesome.',
    'Rise up, it is morning.',
  ],
  // Medium: three sentences, each max 15 words
  MEDIUM: [
    'Wake up and face the world. Today brings new chances to grow. Take one step at a time.',
    'Open your eyes and breathe deep. A new morning has arrived. Rise up and make it count.',
    'Get out of bed and stand tall. Every day is a fresh start. You have what it takes.',
    'The alarm went off for a reason. Today you have goals to reach. Start strong and keep going.',
    'Lift your head and open your eyes. Morning light is calling your name. Great things await you today.',
    'Stop hitting snooze and get up now. Your day will not wait for you. Move forward with purpose.',
    'Greet the morning with energy and drive. Small wins build into big victories. Start here, start now.',
    'Your future begins with this moment. Discipline beats motivation every single day. Rise and do the work.',
    'The early hours belong to the focused. Wake up with intention and clarity. Make today worth remembering.',
    'Today is a blank page to fill. Make good choices and work hard. You can do this.',
  ],
  // Maximum: one paragraph, 80-120 words
  MAXIMUM: [
    'Every morning is a chance to become better than you were yesterday. The world does not wait for those who stay in bed. The achievers, the dreamers, the builders — they all started by getting up when it felt hard. Your body may resist, your mind may want more sleep, but your future self is counting on you to move. Throw off the covers, plant your feet on the floor, and take that first step. Today will not repeat itself. Make it matter.',
    'Rising early is one of the most powerful habits you can build. While the world sleeps, you have a quiet window of time that belongs entirely to you. Use it wisely. The mind is clearest in the morning, before the noise of the day sets in. Every great project, every meaningful goal, every life well-lived began with someone deciding to get up and start. You are capable of far more than you believe. So breathe in, stand tall, and claim this morning as your own.',
    'There is a version of you that does not need an alarm to get up. That version is built through repetition, through choosing discipline when comfort feels easier. You are not there yet, but every morning you rise, you get a little closer. The body follows the mind, and the mind follows the choice. Choose to wake up today. Choose to show up for yourself. The excuses can wait — your goals cannot. Five seconds is all it takes. Count down and rise. Today is yours if you take it.',
    'Waking up early is not about punishment. It is about giving yourself more life. While others sleep in, you are building something — habits, discipline, momentum. The quiet of the morning holds a kind of power that disappears once the day takes over. Guard it. Use it. These early hours are your edge. Whether you spend them planning, moving, reading, or simply breathing with intention, you are investing in yourself. No one can take this time from you. Claim it. Rise before the world demands your attention. Be ready.',
    'Some mornings will feel impossible. Your eyes will feel heavy, the bed will feel warm, and every reason to stay will seem perfectly logical. Push past it. The alarm does not ring to annoy you — it rings because there is something worth doing on the other side of sleep. The people who show up consistently, even when they do not feel like it, are the ones who build lives they are proud of. You do not need to be perfect. You just need to begin. Wake up. Show up. Do the work.',
  ],
};

export function getRandomPhrase(level: TypeTextLevel): string {
  const list = PHRASES[level] ?? PHRASES['EASY'];
  return list[Math.floor(Math.random() * list.length)];
}
