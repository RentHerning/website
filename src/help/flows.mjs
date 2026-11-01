// The guided help flows on /hjaelp/ (/en/help/). Each flow is a short form,
// shown one step at a time in the browser (all at once without JavaScript).
// Text is kept plain and short on purpose: many tenants are not used to web forms.
//
// Field types: choice (big buttons, one answer), radio (one answer, list),
// text, textarea, date, tel, email, address (street + flat no.), names, items (repeatable).
//
// Rita opens a flow with her draft via sessionStorage (key rita-prefill-v2), see help.js.
// Non-personal fields can also be pre-filled by link: /hjaelp/?flow=vicevaert&kategori=vvs

const contactStep = {
  id: 'contact',
  title: { da: 'Hvordan kan vi kontakte dig?', en: 'How can we contact you?' },
  fields: [
    { name: 'navn', type: 'text', required: true, autocomplete: 'name', label: { da: 'Dit navn', en: 'Your name' } },
    { name: 'telefon', type: 'tel', required: true, autocomplete: 'tel', label: { da: 'Telefonnummer', en: 'Phone number' }, hint: { da: 'Så vi kan ringe, hvis vi har spørgsmål.', en: 'So we can call if we have questions.' } },
    { name: 'email', type: 'email', required: false, autocomplete: 'email', label: { da: 'E-mail (valgfri)', en: 'Email (optional)' }, hint: { da: 'Du får en kopi af din besked.', en: 'You’ll get a copy of your message.' } },
  ],
};

const addressStep = {
  id: 'address',
  title: { da: 'Hvor bor du?', en: 'Where do you live?' },
  fields: [
    { name: 'adresse', type: 'text', required: true, autocomplete: 'street-address', label: { da: 'Adresse', en: 'Address' }, placeholder: { da: 'Fx Nørregade 78, 1. th.', en: 'E.g. Nørregade 78, 1. th.' } },
    { name: 'postnr', type: 'text', required: true, autocomplete: 'postal-code', inputmode: 'numeric', label: { da: 'Postnummer og by', en: 'Postcode and town' }, value: '7400 Herning' },
  ],
};

export const FLOWS = [
  {
    id: 'akut',
    icon: 'siren',
    urgent: true,
    title: { da: 'Akut skade', en: 'Emergency damage' },
    summary: { da: 'Brand, vandskade eller andet, der på ingen måde kan vente.', en: 'Fire, water damage or anything else that can’t wait at all.' },
    intro: {
      da: 'Akut er kun brand, vandskade eller andet, der på ingen måde kan vente. Ring til os med det samme, og skriv kun, hvis du ikke kan komme igennem. Er det ikke akut, så brug “Noget skal ordnes” – akutte henvendelser, der ikke er akutte, bliver ikke besvaret.',
      en: 'Emergency means only fire, water damage or anything else that can’t wait at all. Call us straight away, and only write if you can’t get through. If it isn’t urgent, use “Something needs fixing” – non-urgent emergency requests aren’t answered.',
    },
    callFirst: true,
    subject: { da: 'AKUT skade', en: 'EMERGENCY damage' },
    steps: [
      {
        id: 'what',
        title: { da: 'Hvad er der sket?', en: 'What has happened?' },
        fields: [
          {
            name: 'kategori',
            type: 'choice',
            required: true,
            label: { da: 'Vælg det, der passer bedst', en: 'Choose the best match' },
            options: [
              { value: 'vandskade', icon: 'droplets', label: { da: 'Vandskade', en: 'Water damage' } },
              { value: 'brand', icon: 'flame', label: { da: 'Brand (ring 112 først)', en: 'Fire (call 112 first)' } },
              { value: 'andet', icon: 'circle-help', label: { da: 'Andet, der ikke kan vente', en: 'Something else that can’t wait' } },
            ],
          },
          { name: 'besked', type: 'textarea', required: true, label: { da: 'Beskriv kort, hvad der er sket', en: 'Briefly describe what happened' } },
        ],
      },
      addressStep,
      contactStep,
    ],
  },
  {
    id: 'vicevaert',
    icon: 'wrench',
    title: { da: 'Noget skal ordnes', en: 'Something needs fixing' },
    summary: { da: 'Opgaver til viceværten, fx en dryppende hane eller en løs dør.', en: 'Jobs for the caretaker, like a dripping tap or a loose door.' },
    subject: { da: 'Opgave til vicevært', en: 'Caretaker request' },
    steps: [
      {
        id: 'what',
        title: { da: 'Hvad drejer det sig om?', en: 'What is it about?' },
        fields: [
          {
            name: 'kategori',
            type: 'choice',
            required: true,
            label: { da: 'Vælg det, der passer bedst', en: 'Choose the best match' },
            options: [
              { value: 'vvs', icon: 'droplet', label: { da: 'Vand, vask og toilet', en: 'Water, sink and toilet' } },
              { value: 'varme', icon: 'thermometer', label: { da: 'Radiatorer og varme', en: 'Radiators and heating' } },
              { value: 'el', icon: 'lightbulb', label: { da: 'El og lys', en: 'Electrics and lights' } },
              { value: 'doere', icon: 'door-open', label: { da: 'Døre, vinduer og låse', en: 'Doors, windows and locks' } },
              { value: 'hvidevarer', icon: 'refrigerator', label: { da: 'Hvidevarer', en: 'Appliances' } },
              { value: 'ude', icon: 'trees', label: { da: 'Udenfor og fællesarealer', en: 'Outside and shared areas' } },
              { value: 'andet', icon: 'circle-help', label: { da: 'Andet', en: 'Something else' } },
            ],
          },
        ],
      },
      {
        id: 'describe',
        title: { da: 'Fortæl os lidt mere', en: 'Tell us a bit more' },
        fields: [
          { name: 'besked', type: 'textarea', required: true, label: { da: 'Hvad er problemet, og hvor i boligen?', en: 'What is the problem, and where in the home?' }, placeholder: { da: 'Fx: Hanen i køkkenet drypper, også når den er lukket.', en: 'E.g.: The kitchen tap drips even when it’s turned off.' } },
          {
            name: 'adgang',
            type: 'radio',
            required: true,
            label: { da: 'Må viceværten låse sig ind, hvis du ikke er hjemme?', en: 'May the caretaker let themselves in if you’re not at home?' },
            options: [
              { value: 'ja', label: { da: 'Ja, det er fint', en: 'Yes, that’s fine' } },
              { value: 'nej', label: { da: 'Nej, ring først og aftal en tid', en: 'No, call first to agree a time' } },
            ],
          },
        ],
      },
      addressStep,
      {
        ...contactStep,
        fields: [
          ...contactStep.fields,
          {
            name: 'accept_regning',
            type: 'checkbox',
            required: true,
            label: {
              da: 'Jeg er indforstået med, at hvis opgaven hører under indvendig vedligeholdelse, eller skaden er selvforskyldt, sender Herning Boligservice en regning.',
              en: 'I understand that if the job falls under interior maintenance, or the damage is my own fault, Herning Boligservice will send an invoice.',
            },
            hint: { da: 'Hvem der har den indvendige vedligeholdelse, står i din lejekontrakt.', en: 'Your tenancy agreement says who is responsible for interior maintenance.' },
          },
        ],
      },
    ],
  },
  {
    id: 'syn',
    icon: 'clipboard-check',
    title: { da: 'Fejl og mangler efter indflytning', en: 'Faults after moving in' },
    summary: { da: '14-dages syn: meld fejl og mangler, du har fundet i din nye bolig.', en: '14-day inspection: report faults you’ve found in your new home.' },
    intro: {
      da: 'Fejl og mangler skal meldes senest 14 dage efter indflytning. Vigtigt: Din indsendelse er den gældende – du kan ikke sende en ny bagefter. Gennemgå derfor hele boligen, og saml alt i én indsendelse.',
      en: 'Faults must be reported no later than 14 days after moving in. Important: your submission is final – you can’t send another one later. So go through the whole home and put everything in one submission.',
    },
    subject: { da: '14-dages syn', en: '14-day inspection' },
    steps: [
      {
        id: 'when',
        title: { da: 'Hvornår flyttede du ind?', en: 'When did you move in?' },
        fields: [
          { name: 'indflytning', type: 'date', required: true, check: 'within14', label: { da: 'Dato for indflytning', en: 'Move-in date' } },
        ],
      },
      {
        id: 'items',
        title: { da: 'Hvad har du fundet?', en: 'What have you found?' },
        fields: [
          {
            name: 'stand',
            type: 'textarea',
            required: false,
            rows: 4,
            label: { da: 'Lejemålets stand (valgfri)', en: 'Condition of the home (optional)' },
            hint: { da: 'Ting du først har opdaget nu, fx buler i hvidevarer. Listen gemmes til udflytning, så du ikke betaler for skader, du ikke har lavet.', en: 'Things you’ve only noticed now, e.g. dents in appliances. The list is kept for when you move out, so you don’t pay for damage you didn’t cause.' },
          },
          {
            name: 'mangler',
            type: 'textarea',
            required: true,
            rows: 7,
            label: { da: 'Fejl og mangler, der skal laves – én pr. linje', en: 'Faults that need fixing – one per line' },
            hint: { da: 'Skriv rummet først. Fx: “Køkken: stikkontakten ved vinduet virker ikke”.', en: 'Start with the room. E.g.: “Kitchen: the socket by the window doesn’t work”.' },
          },
        ],
      },
      addressStep,
      contactStep,
    ],
  },
  {
    id: 'opsigelse',
    icon: 'door-open',
    title: { da: 'Jeg vil flytte', en: 'I want to move out' },
    summary: { da: 'Opsig dit lejemål. Vi bekræfter, når vi har modtaget opsigelsen.', en: 'Give notice on your home. We confirm when we’ve received it.' },
    intro: {
      da: 'De fleste af vores lejemål har et opsigelsesvarsel på løbende måned plus 3 måneder – tjek altid din egen lejekontrakt. Du skal være flyttet ud senest 14 dage før lejeperiodens slutning, men betaler fuld husleje for den sidste måned. Står I flere på kontrakten, skal alle være med.',
      en: 'Most of our homes have a notice period of the current month plus 3 months – always check your own tenancy agreement. You must have moved out no later than 14 days before the tenancy ends, but you pay full rent for the last month. If more than one person is on the agreement, everyone must be included.',
    },
    subject: { da: 'Opsigelse af lejemål', en: 'Notice to move out' },
    steps: [
      addressStep,
      {
        id: 'when',
        title: { da: 'Hvornår vil du flytte?', en: 'When do you want to move out?' },
        fields: [
          { name: 'fraflytning', type: 'date', required: true, check: 'notice', label: { da: 'Hvornår flytter du ud?', en: 'When will you move out?' } },
        ],
      },
      {
        id: 'who',
        title: { da: 'Hvem står på lejekontrakten?', en: 'Who is on the tenancy agreement?' },
        fields: [
          { name: 'lejere', type: 'textarea', required: true, rows: 3, label: { da: 'Fulde navne på alle lejere', en: 'Full names of all tenants' }, hint: { da: 'Ét navn pr. linje.', en: 'One name per line.' } },
          { name: 'ny_adresse', type: 'text', required: false, autocomplete: 'off', label: { da: 'Din nye adresse (hvis du kender den)', en: 'Your new address (if you know it)' }, hint: { da: 'Bruges til opgørelsen af dit depositum.', en: 'Used for settling your deposit.' } },
        ],
      },
      contactStep,
    ],
  },
  {
    id: 'andet',
    icon: 'message-circle-question',
    title: { da: 'Andre spørgsmål', en: 'Other questions' },
    summary: { da: 'Husleje, husorden eller noget helt tredje.', en: 'Rent, house rules or anything else.' },
    subject: { da: 'Spørgsmål', en: 'Question' },
    steps: [
      {
        id: 'topic',
        title: { da: 'Hvad handler dit spørgsmål om?', en: 'What is your question about?' },
        fields: [
          {
            name: 'emne',
            type: 'choice',
            required: true,
            label: { da: 'Vælg et emne', en: 'Choose a topic' },
            options: [
              { value: 'husleje', icon: 'receipt-text', label: { da: 'Husleje og betaling', en: 'Rent and payment' } },
              { value: 'husorden', icon: 'scroll-text', label: { da: 'Husorden og naboer', en: 'House rules and neighbours' } },
              { value: 'kontrakt', icon: 'file-text', label: { da: 'Lejekontrakt', en: 'Tenancy agreement' } },
              { value: 'andet', icon: 'circle-help', label: { da: 'Andet', en: 'Something else' } },
            ],
          },
          { name: 'besked', type: 'textarea', required: true, label: { da: 'Dit spørgsmål', en: 'Your question' } },
        ],
      },
      contactStep,
    ],
  },
];

/** "Looking for a home?" isn't a form – it sends people to the listings. */
export const SEEKER = {
  icon: 'house',
  title: { da: 'Jeg leder efter en bolig', en: 'I’m looking for a home' },
  summary: { da: 'Se vores ledige boliger og skriv til os via Boligportal.', en: 'See our available homes and message us via Boligportal.' },
};
