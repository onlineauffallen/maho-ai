export type OnboardingQuestion = {
  id: string;
  question: string;
  options: string[];
  type: 'single' | 'multi';
};

export const onboardingQuestions: Record<string, OnboardingQuestion[]> = {
  Finanziell: [
    {
      id: 'investmentarten',
      question: 'Welche Investmentarten interessieren dich?',
      options: ['Aktien', 'ETFs', 'Krypto', 'Gold', 'Immobilien', 'Andere'],
      type: 'multi',
    },
    {
      id: 'ethik',
      question: 'Wie wichtig sind dir ethische Kriterien?',
      options: ['Sehr wichtig', 'Wichtig', 'Nicht so wichtig'],
      type: 'single',
    },
    {
      id: 'anlageziel',
      question: 'Was ist dein primäres Anlageziel?',
      options: [
        'Langfristiger Vermögensaufbau',
        'Passives Einkommen',
        'Risikoreiches Wachstum',
        'Absicherung',
      ],
      type: 'single',
    },
  ],
  Business: [
    {
      id: 'status',
      question: 'Wie bist du aktuell beruflich tätig?',
      options: [
        'Angestellt',
        'Selbstständig',
        'Unternehmer:in',
        'Arbeitssuchend',
        'Sonstiges',
      ],
      type: 'single',
    },
    {
      id: 'business-ziel',
      question: 'Was ist dein größtes berufliches Ziel?',
      options: [
        'Karriereaufstieg',
        'Eigenes Business ausbauen',
        'Work-Life-Balance',
        'Neue Fähigkeiten lernen',
        'Mehr Einkommen',
      ],
      type: 'multi',
    },
    {
      id: 'skills',
      question: 'Welche Skills möchtest du am meisten verbessern?',
      options: [
        'Präsentation',
        'Leadership',
        'Projektmanagement',
        'Zeitmanagement',
        'Kommunikation',
        'Verkauf',
        'Andere',
      ],
      type: 'multi',
    },
  ],
  Fitness: [
    {
      id: 'fitness-ziel',
      question: 'Was ist dein Hauptziel beim Training?',
      options: [
        'Abnehmen',
        'Muskelaufbau',
        'Gesundheit & Wohlbefinden',
        'Ausdauer steigern',
        'Körper definieren',
        'Sonstiges',
      ],
      type: 'single',
    },
    {
      id: 'trainingshäufigkeit',
      question: 'Wie oft möchtest du pro Woche trainieren?',
      options: ['1x', '2x', '3x', '4x', '5x+'],
      type: 'single',
    },
    {
      id: 'sportarten',
      question: 'Welche Sportarten interessieren dich?',
      options: [
        'Krafttraining',
        'Laufen/Joggen',
        'Radfahren',
        'Schwimmen',
        'Teamsport',
        'Yoga/Pilates',
        'Andere',
      ],
      type: 'multi',
    },
  ],
  Therapie: [
    {
      id: 'themen',
      question: 'Bei welchen Themen wünschst du dir Unterstützung?',
      options: [
        'Stressbewältigung',
        'Selbstreflexion',
        'Traumaverarbeitung',
        'Krisenintervention',
        'Motivation',
        'Selbstbewusstsein',
        'Anderes',
      ],
      type: 'multi',
    },
    {
      id: 'frequenz',
      question: 'Wie häufig möchtest du Unterstützung/Impulse?',
      options: [
        'Täglich',
        'Mehrmals pro Woche',
        'Wöchentlich',
        'Nach Bedarf',
      ],
      type: 'single',
    },
  ],
  Religiös: [
    {
      id: 'glaube',
      question: 'Welcher Glaubensrichtung fühlst du dich zugehörig?',
      options: [
        'Islam',
        'Christentum',
        'Judentum',
        'Buddhismus',
        'Hinduismus',
        'Agnostisch',
        'Atheistisch',
        'Andere',
      ],
      type: 'single',
    },
    {
      id: 'praxis',
      question: 'Wie regelmäßig lebst du deine Religion im Alltag?',
      options: [
        'Sehr regelmäßig',
        'Gelegentlich',
        'Selten',
        'Ich möchte mehr integrieren',
      ],
      type: 'single',
    },
    {
      id: 'unterstützung',
      question: 'Wobei wünschst du dir Unterstützung?',
      options: [
        'Gebets-Routine',
        'Motivation zu spirituellen Praktiken',
        'Fragen zu religiösen Regeln',
        'Gemeinschaft finden',
        'Krisen & Zweifel',
        'Anderes',
      ],
      type: 'multi',
    },
  ],
};
