import { Component, EventEmitter, HostListener, Input, Output, computed, signal } from '@angular/core';

// Set to the production endpoint when form handling is confirmed (see footer note).
const LEAD_ENDPOINT = '';

const VENUE_HIRE: Record<number, { summer: Record<DayTier, number>; offpeak: Record<DayTier, number> }> = {
  2026: { summer: { midweek: 4000, frisun: 4500, sat: 5000 }, offpeak: { midweek: 3000, frisun: 3500, sat: 4000 } },
  2027: { summer: { midweek: 4500, frisun: 5000, sat: 5500 }, offpeak: { midweek: 3500, frisun: 4000, sat: 4500 } },
  2028: { summer: { midweek: 5000, frisun: 5500, sat: 6000 }, offpeak: { midweek: 4000, frisun: 4500, sat: 5000 } },
};
const TWILIGHT_HIRE = 3500;
const PP = { canapes: 10, breakfast: 55, bbq: 35, pizzas: 13, drinks: 25 };

type Occasion = 'wedding' | 'twilight' | 'party' | 'corporate';
type DayTier = 'midweek' | 'frisun' | 'sat';
type StepId =
  | 'occasion' | 'timing' | 'day' | 'showcase' | 'guests' | 'evening' | 'headcount'
  | 'ceremony' | 'food' | 'drinks' | 'stage' | 'tease' | 'contact' | 'result';

interface CardOption {
  value: string;
  label: string;
  sub?: string;
  image?: string;
}

interface EstimateLine {
  label: string;
  detail: string;
  low: number;
  high: number;
  toggleKey?: 'canapes' | 'drinks' | 'pizzas';
}

const OCCASION_OPTIONS: CardOption[] = [
  { value: 'wedding', label: 'A wedding', sub: 'The full day, ceremony to last dance', image: '/media/estate/weddings-confetti.webp' },
  { value: 'twilight', label: 'A twilight wedding', sub: 'A shorter day, beginning mid afternoon', image: '/media/estate/festoon-courtyard.webp' },
  { value: 'party', label: 'A party', sub: 'Birthdays, anniversaries, New Year, Christmas', image: '/media/estate/barn-band.webp' },
  { value: 'corporate', label: 'Corporate or retreat', sub: 'Away days, gatherings, quiet thinking space', image: '/media/estate/manor-lawn.webp' },
];

const TIMING_OPTIONS: CardOption[] = [
  { value: '2026-summer', label: 'Summer 2026', sub: 'May to September' },
  { value: '2026-offpeak', label: 'Off peak 2026', sub: 'October to April' },
  { value: '2027-summer', label: 'Summer 2027', sub: 'May to September' },
  { value: '2027-offpeak', label: 'Off peak 2027', sub: 'October to April' },
  { value: '2028-summer', label: 'Summer 2028', sub: 'May to September' },
  { value: '2028-offpeak', label: 'Off peak 2028', sub: 'October to April' },
  { value: 'undecided', label: 'Not settled yet', sub: 'We will keep the estimate open' },
];

const DAY_OPTIONS: CardOption[] = [
  { value: 'sat', label: 'A Saturday', sub: 'The classic choice' },
  { value: 'frisun', label: 'Friday or Sunday', sub: 'A little easier on the budget' },
  { value: 'midweek', label: 'Midweek', sub: 'Monday to Thursday, the quietest rates' },
  { value: 'flexible', label: 'We are flexible', sub: 'We will show the range' },
];

const CEREMONY_OPTIONS: CardOption[] = [
  { value: 'gazebo', label: 'The walled gardens', sub: 'Under the gazebo, open sky', image: '/media/estate/gazebo-ceremony.webp' },
  { value: 'lawns', label: 'On the lawns', sub: 'Wide grass, countryside behind', image: '/media/estate/lawn-ceremony.webp' },
  { value: 'elsewhere', label: 'Elsewhere first', sub: 'Church or registry office, then here', image: '/media/estate/countryside-couple.webp' },
  { value: 'undecided', label: 'Not decided', sub: 'Easiest to choose once you have walked it', image: '/media/estate/garden-ceremony.webp' },
];

const FOOD_OPTIONS: CardOption[] = [
  { value: 'breakfast', label: 'Three course wedding breakfast', sub: 'Seated, in the marquee. £55 a head', image: '/media/estate/plated-dish.webp' },
  { value: 'bbq', label: 'BBQ or hog roast', sub: 'Relaxed, in place of the breakfast. £35 a head', image: '/media/white-bloom/event/event-27.webp' },
  { value: 'undecided', label: 'Still deciding', sub: 'We will show the classic day as a guide', image: '/media/estate/marquee-interior.webp' },
];

const DRINKS_OPTIONS: CardOption[] = [
  { value: 'package', label: 'The drinks package', sub: '£25 a head. Two drinks after the ceremony, wine with the meal, a toast for the speeches', image: '/media/estate/champagne.webp' },
  { value: 'own', label: 'We will arrange our own', sub: 'The team can talk you through options', image: '/media/estate/festoon-courtyard.webp' },
  { value: 'undecided', label: 'Not sure yet', sub: 'We will include it as a guide', image: '/media/estate/canapes.webp' },
];

const STAGE_OPTIONS: CardOption[] = [
  { value: 'beginning', label: 'Just beginning', sub: 'Ideas first, details later' },
  { value: 'shortlisting', label: 'Shortlisting', sub: 'A few venues in the running' },
  { value: 'ready', label: 'Ready to book', sub: 'The date is nearly settled' },
  { value: 'curious', label: 'Simply curious', sub: 'No rush, happy looking' },
];

const HEARD_OPTIONS = ['Instagram', 'Google', 'Hitched or Bridebook', 'A recommendation', 'Drove past', 'Other'];

const STEP_IMAGES: Partial<Record<StepId, string>> = {
  occasion: '/media/estate/manor-aerial.webp',
  timing: '/media/estate/estate-aerial.webp',
  day: '/media/estate/golden-veil.webp',
  guests: '/media/estate/marquee-interior.webp',
  evening: '/media/estate/barn-band.webp',
  headcount: '/media/estate/barn-band.webp',
  ceremony: '/media/estate/gazebo-ceremony.webp',
  food: '/media/estate/plated-dish.webp',
  drinks: '/media/estate/champagne.webp',
  stage: '/media/estate/weddings-confetti.webp',
  tease: '/media/estate/coach-cottage.webp',
  contact: '/media/estate/marquee-night.webp',
};

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.html',
  styleUrl: './quiz.scss',
})
export class Quiz {
  @Input() set open(value: boolean) {
    this.isOpen.set(value);
  }
  @Output() closed = new EventEmitter<void>();

  protected readonly isOpen = signal(false);
  protected readonly stepIndex = signal(0);
  protected readonly submitted = signal(false);

  protected readonly occasion = signal<Occasion | null>(null);
  protected readonly timing = signal<string | null>(null);
  protected readonly dayTier = signal<string | null>(null);
  protected readonly dayGuests = signal(50);
  protected readonly eveningGuests = signal(70);
  protected readonly headcount = signal(60);
  protected readonly ceremony = signal<string | null>(null);
  protected readonly food = signal<string | null>(null);
  protected readonly drinks = signal<string | null>(null);
  protected readonly stage = signal<string | null>(null);
  protected readonly leadName = signal('');
  protected readonly leadEmail = signal('');
  protected readonly leadPhone = signal('');
  protected readonly leadHeard = signal('');
  protected readonly contactError = signal('');

  protected readonly extraCanapes = signal(true);
  protected readonly extraDrinks = signal(true);
  protected readonly extraPizzas = signal(true);

  protected readonly reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected readonly occasionOptions = OCCASION_OPTIONS;
  protected readonly timingOptions = TIMING_OPTIONS;
  protected readonly dayOptions = DAY_OPTIONS;
  protected readonly ceremonyOptions = CEREMONY_OPTIONS;
  protected readonly foodOptions = FOOD_OPTIONS;
  protected readonly drinksOptions = DRINKS_OPTIONS;
  protected readonly stageOptions = STAGE_OPTIONS;
  protected readonly heardOptions = HEARD_OPTIONS;

  protected readonly steps = computed<StepId[]>(() => {
    switch (this.occasion()) {
      case 'twilight':
        return ['occasion', 'timing', 'showcase', 'guests', 'ceremony', 'food', 'drinks', 'stage', 'tease', 'contact', 'result'];
      case 'party':
      case 'corporate':
        return ['occasion', 'timing', 'headcount', 'showcase', 'stage', 'tease', 'contact', 'result'];
      default:
        return ['occasion', 'timing', 'day', 'showcase', 'guests', 'evening', 'ceremony', 'food', 'drinks', 'stage', 'tease', 'contact', 'result'];
    }
  });

  protected readonly currentStep = computed<StepId>(() => this.steps()[Math.min(this.stepIndex(), this.steps().length - 1)]);

  protected readonly questionSteps = computed(() => this.steps().filter((s) => !['showcase', 'tease', 'result'].includes(s)));
  protected readonly questionNumber = computed(() => {
    const current = this.currentStep();
    const index = this.questionSteps().indexOf(current);
    return index === -1 ? null : index + 1;
  });

  protected readonly isWeddingPath = computed(() => this.occasion() === 'wedding' || this.occasion() === 'twilight' || this.occasion() === null);
  protected readonly isEventPath = computed(() => this.occasion() === 'party' || this.occasion() === 'corporate');

  protected readonly stepImage = computed(() => STEP_IMAGES[this.currentStep()] ?? '/media/estate/manor-aerial.webp');

  protected readonly overCapacityDay = computed(() => this.dayGuests() >= 60);
  protected readonly overCapacityEvening = computed(() => this.eveningGuests() >= 80);

  protected readonly recapChips = computed(() => {
    const chips: string[] = [];
    const occ = OCCASION_OPTIONS.find((o) => o.value === this.occasion());
    if (occ) chips.push(occ.label);
    const timing = TIMING_OPTIONS.find((o) => o.value === this.timing());
    if (timing && timing.value !== 'undecided') chips.push(timing.label);
    if (this.isEventPath()) {
      chips.push(`Around ${this.headcount()} guests`);
    } else {
      chips.push(`${this.dayGuests()} day guests`);
      if (this.occasion() === 'wedding') chips.push(`${this.eveningGuests()} in the evening`);
      const cer = CEREMONY_OPTIONS.find((o) => o.value === this.ceremony());
      if (cer && cer.value !== 'undecided' && cer.value !== 'elsewhere') chips.push(cer.label);
      if (this.food() === 'breakfast') chips.push('Three course breakfast');
      if (this.food() === 'bbq') chips.push('BBQ or hog roast');
    }
    return chips;
  });

  // ----- Estimate -----

  private hireFor(years: number[], seasons: ('summer' | 'offpeak')[], tiers: DayTier[]): { low: number; high: number } {
    let low = Infinity;
    let high = 0;
    for (const y of years) {
      for (const s of seasons) {
        for (const t of tiers) {
          const v = VENUE_HIRE[y][s][t];
          low = Math.min(low, v);
          high = Math.max(high, v);
        }
      }
    }
    return { low, high };
  }

  private timingParts(value: string | null): { years: number[]; seasons: ('summer' | 'offpeak')[] } {
    if (value && value !== 'undecided') {
      return { years: [Number(value.split('-')[0])], seasons: [value.split('-')[1] as 'summer' | 'offpeak'] };
    }
    return { years: [2026, 2027, 2028], seasons: ['summer', 'offpeak'] };
  }

  protected timingPrice(value: string): string {
    if (this.occasion() === 'twilight') {
      return 'Venue hire £3,500, any date';
    }
    const parts = this.timingParts(value);
    const range = this.hireFor(parts.years, parts.seasons, ['midweek', 'frisun', 'sat']);
    return `Venue hire ${this.formatMoney(range.low)} to ${this.formatMoney(range.high)}`;
  }

  protected dayPrice(value: string): string {
    const parts = this.timingParts(this.timing());
    const tiers: DayTier[] = value === 'flexible' ? ['midweek', 'frisun', 'sat'] : [value as DayTier];
    const range = this.hireFor(parts.years, parts.seasons, tiers);
    return range.low === range.high
      ? `${this.formatMoney(range.low)} venue hire`
      : `${this.formatMoney(range.low)} to ${this.formatMoney(range.high)} venue hire`;
  }

  protected readonly runningTotal = computed<{ label: string } | null>(() => {
    if (this.isEventPath() || this.timing() === null) return null;
    const twilight = this.occasion() === 'twilight';
    const day = Math.min(this.dayGuests(), 60);
    const evening = twilight ? day : Math.min(this.eveningGuests(), 80);
    const hire = this.hireRange();
    const mainRate = this.food() === 'bbq' ? PP.bbq : PP.breakfast;
    let perPerson = day * mainRate + evening * PP.pizzas;
    if (!twilight) perPerson += day * PP.canapes;
    if (this.drinks() !== 'own') perPerson += day * PP.drinks;
    const low = hire.low + perPerson;
    const high = hire.high + perPerson;
    return { label: low === high ? this.formatMoney(low) : `${this.formatMoney(low)} to ${this.formatMoney(high)}` };
  });

  protected readonly runningBarVisible = computed(() => {
    const step = this.currentStep();
    return this.runningTotal() !== null && !['occasion', 'timing', 'result'].includes(step);
  });

  private hireRange(): { low: number; high: number; label: string } {
    if (this.occasion() === 'twilight') {
      return { low: TWILIGHT_HIRE, high: TWILIGHT_HIRE, label: 'Twilight venue hire, all year round' };
    }
    const timing = this.timing();
    const tier = this.dayTier();
    const parts = this.timingParts(timing);
    const tiers: DayTier[] = tier && tier !== 'flexible' ? [tier as DayTier] : ['midweek', 'frisun', 'sat'];
    const { low, high } = this.hireFor(parts.years, parts.seasons, tiers);
    const timingLabel = TIMING_OPTIONS.find((o) => o.value === timing)?.label ?? 'date to be settled';
    const dayLabel = DAY_OPTIONS.find((o) => o.value === tier)?.label ?? 'day to be settled';
    return { low, high, label: `${timingLabel}, ${dayLabel}` };
  }

  protected readonly estimateLines = computed<EstimateLine[]>(() => {
    if (this.isEventPath()) return [];
    const twilight = this.occasion() === 'twilight';
    const day = Math.min(this.dayGuests(), 60);
    const evening = twilight ? day : Math.min(this.eveningGuests(), 80);
    const hire = this.hireRange();
    const mainRate = this.food() === 'bbq' ? PP.bbq : PP.breakfast;
    const mainLabel = this.food() === 'bbq' ? 'BBQ or hog roast' : 'Three course wedding breakfast';

    const lines: EstimateLine[] = [
      {
        label: 'Venue hire',
        detail: `${hire.label}. Includes the walled gardens and gazebo, the dressed marquee, the fairy lit barn and Coach Cottage for the night before and the night itself`,
        low: hire.low,
        high: hire.high,
      },
      {
        label: mainLabel,
        detail: `${day} guests at £${mainRate} a head`,
        low: day * mainRate,
        high: day * mainRate,
      },
    ];
    if (!twilight) {
      lines.push({
        label: 'Canapés on arrival',
        detail: `${day} guests at £${PP.canapes} a head, four each`,
        low: day * PP.canapes,
        high: day * PP.canapes,
        toggleKey: 'canapes',
      });
    }
    lines.push({
      label: 'The drinks package',
      detail: `${day} guests at £${PP.drinks} a head. Two drinks after the ceremony, wine with the meal, a toast for the speeches`,
      low: day * PP.drinks,
      high: day * PP.drinks,
      toggleKey: 'drinks',
    });
    lines.push({
      label: 'Wood fired pizzas in the evening',
      detail: `${evening} ${twilight ? 'guests' : 'evening guests'} at £${PP.pizzas} a head`,
      low: evening * PP.pizzas,
      high: evening * PP.pizzas,
      toggleKey: 'pizzas',
    });
    return lines;
  });

  protected readonly estimateTotal = computed(() => {
    let low = 0;
    let high = 0;
    for (const line of this.estimateLines()) {
      if (line.toggleKey === 'canapes' && !this.extraCanapes()) continue;
      if (line.toggleKey === 'drinks' && !this.extraDrinks()) continue;
      if (line.toggleKey === 'pizzas' && !this.extraPizzas()) continue;
      low += line.low;
      high += line.high;
    }
    return { low, high, isRange: low !== high };
  });

  protected lineIncluded(line: EstimateLine): boolean {
    if (line.toggleKey === 'canapes') return this.extraCanapes();
    if (line.toggleKey === 'drinks') return this.extraDrinks();
    if (line.toggleKey === 'pizzas') return this.extraPizzas();
    return true;
  }

  protected toggleLine(line: EstimateLine): void {
    if (line.toggleKey === 'canapes') this.extraCanapes.update((v) => !v);
    if (line.toggleKey === 'drinks') this.extraDrinks.update((v) => !v);
    if (line.toggleKey === 'pizzas') this.extraPizzas.update((v) => !v);
  }

  protected formatMoney(value: number): string {
    return '£' + value.toLocaleString('en-GB');
  }

  protected readonly resultStrip = computed(() => {
    if (this.isEventPath()) {
      return ['/media/estate/festoon-courtyard.webp', '/media/estate/marquee-night.webp', '/media/estate/barn-band.webp', '/media/estate/manor-lawn.webp'];
    }
    const ceremonyImage = CEREMONY_OPTIONS.find((o) => o.value === this.ceremony())?.image ?? '/media/estate/gazebo-ceremony.webp';
    return [ceremonyImage, '/media/estate/marquee-interior.webp', '/media/estate/barn-fairylit.webp', '/media/estate/weddings-confetti.webp', '/media/estate/coach-cottage.webp'];
  });

  protected readonly firstName = computed(() => this.leadName().trim().split(/[\s&,]+/)[0] || 'Hello');

  // ----- Navigation -----

  protected pick(step: StepId, value: string): void {
    switch (step) {
      case 'occasion':
        this.occasion.set(value as Occasion);
        break;
      case 'timing':
        this.timing.set(value);
        break;
      case 'day':
        this.dayTier.set(value);
        break;
      case 'ceremony':
        this.ceremony.set(value);
        break;
      case 'food':
        this.food.set(value);
        break;
      case 'drinks':
        this.drinks.set(value);
        this.extraDrinks.set(value !== 'own');
        break;
      case 'stage':
        this.stage.set(value);
        break;
    }
    this.next();
  }

  protected selectedValue(step: StepId): string | null {
    switch (step) {
      case 'occasion': return this.occasion();
      case 'timing': return this.timing();
      case 'day': return this.dayTier();
      case 'ceremony': return this.ceremony();
      case 'food': return this.food();
      case 'drinks': return this.drinks();
      case 'stage': return this.stage();
      default: return null;
    }
  }

  protected next(): void {
    if (this.currentStep() === 'guests' && this.occasion() === 'wedding') {
      this.eveningGuests.set(Math.min(Math.max(this.eveningGuests(), this.dayGuests()), 80));
    }
    this.stepIndex.update((i) => Math.min(i + 1, this.steps().length - 1));
  }

  protected back(): void {
    this.stepIndex.update((i) => Math.max(i - 1, 0));
  }

  protected onDayGuestsInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.dayGuests.set(value);
    this.eveningGuests.update((e) => Math.min(Math.max(e, value), 80));
  }

  protected onEveningGuestsInput(event: Event): void {
    this.eveningGuests.set(Number((event.target as HTMLInputElement).value));
  }

  protected onHeadcountInput(event: Event): void {
    this.headcount.set(Number((event.target as HTMLInputElement).value));
  }

  protected submitContact(event: Event): void {
    event.preventDefault();
    const name = this.leadName().trim();
    const email = this.leadEmail().trim();
    if (!name) {
      this.contactError.set('Add a first name so the team knows who to reply to.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.contactError.set('That email does not look complete. One more look?');
      return;
    }
    this.contactError.set('');
    this.submitted.set(true);
    void this.sendLead();
    this.next();
  }

  private buildLeadPayload(): Record<string, unknown> {
    const total = this.estimateTotal();
    return {
      source: 'swarling-quiz',
      submittedAt: new Date().toISOString(),
      name: this.leadName().trim(),
      email: this.leadEmail().trim(),
      phone: this.leadPhone().trim() || null,
      heardAbout: this.leadHeard() || null,
      occasion: this.occasion(),
      timing: this.timing(),
      dayPreference: this.dayTier(),
      dayGuests: this.isEventPath() ? null : this.dayGuests(),
      eveningGuests: this.occasion() === 'wedding' ? this.eveningGuests() : null,
      headcount: this.isEventPath() ? this.headcount() : null,
      overCapacity: this.overCapacityDay() || this.overCapacityEvening(),
      ceremony: this.ceremony(),
      food: this.food(),
      drinks: this.drinks(),
      planningStage: this.stage(),
      extras: { canapes: this.extraCanapes(), drinks: this.extraDrinks(), pizzas: this.extraPizzas() },
      guideEstimate: this.isEventPath() ? null : total,
    };
  }

  private async sendLead(): Promise<void> {
    if (!LEAD_ENDPOINT) {
      return;
    }
    try {
      await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildLeadPayload()),
      });
    } catch {
      // The result screen still shows; the team also receives the enquiry via the tour email.
    }
  }

  protected tourMailto(): string {
    const total = this.estimateTotal();
    const subject = encodeURIComponent(`Tour request — ${this.leadName().trim() || 'Quiz enquiry'}`);
    const chips = this.recapChips().join(' · ');
    const estimate = this.isEventPath()
      ? 'Tailored proposal requested.'
      : `Guide estimate: ${this.formatMoney(total.low)}${total.isRange ? ' to ' + this.formatMoney(total.high) : ''}.`;
    const body = encodeURIComponent(
      `Hello Swarling Manor,\n\nWe just planned our day on your site and would love to book a tour.\n\n${chips}\n${estimate}\n\n${this.leadName().trim()}\n${this.leadPhone().trim()}`,
    );
    return `mailto:hello@swarlingmanor.com?subject=${subject}&body=${body}`;
  }

  protected openQuiz(): void {
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  protected restart(): void {
    this.stepIndex.set(0);
    this.submitted.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
