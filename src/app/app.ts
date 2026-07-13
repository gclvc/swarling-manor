import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, QueryList, ViewChild, ViewChildren, signal } from '@angular/core';
import { Quiz } from './quiz/quiz';

interface NavGroup {
  label: string;
  href?: string;
  items?: { label: string; href: string }[];
}

interface ImageCard {
  title: string;
  body: string;
  image: string;
  alt: string;
  href: string;
}

const navGroups: NavGroup[] = [
  {
    label: 'Events',
    items: [
      { label: 'Parties', href: '#events' },
      { label: 'Retreats', href: '#events' },
      { label: 'Corporate', href: '#events' },
    ],
  },
  {
    label: 'Weddings',
    items: [
      { label: 'Brochure', href: '#brochure' },
      { label: 'Gallery', href: '#gallery' },
      { label: 'Pricing', href: '#quote' },
      { label: 'Catering', href: '#spaces' },
      { label: 'Suppliers', href: '#quote' },
    ],
  },
  { label: 'Christmas', href: '#events' },
  { label: 'Open Day', href: '#quote' },
  { label: 'Guest Info', href: '#contact' },
];

const occasionCards: ImageCard[] = [
  {
    title: 'Weddings',
    body: 'Garden ceremonies, marquee dining and an evening party that can stay close to the estate.',
    image: '/media/estate/weddings-confetti.webp',
    alt: 'Newlyweds walking through a confetti shower at Swarling Manor',
    href: '#spaces',
  },
  {
    title: 'Events',
    body: 'Summer tables, drinks, food stations and guests moving through the gardens.',
    image: '/media/estate/marquee-night.webp',
    alt: 'The marquee glowing at night across the lawn at Swarling Manor',
    href: '#events',
  },
  {
    title: 'Stay',
    body: 'Coach Cottage gives couples a quiet base for preparations and the wedding night.',
    image: '/media/estate/coach-cottage.webp',
    alt: 'Coach Cottage at Swarling Manor with guests at the door',
    href: '#contact',
  },
];

const spaces = [
  {
    title: 'The Gazebo',
    body: 'A garden ceremony point framed by lawn, trees and open Kent countryside.',
    image: '/media/estate/gazebo-ceremony.webp',
    alt: 'Wedding ceremony under the gazebo at Swarling Manor',
  },
  {
    title: 'The Marquee',
    body: 'A dressed, connected space for the wedding breakfast and speeches.',
    image: '/media/estate/marquee-interior.webp',
    alt: 'Wedding breakfast in full swing inside the marquee at Swarling Manor',
  },
  {
    title: 'The Barn',
    body: 'A rustic, fairy-lit place for the evening party when the day changes gear.',
    image: '/media/estate/barn-fairylit.webp',
    alt: 'Fairy-lit barn dressed for a ceremony at Swarling Manor',
  },
  {
    title: 'The Grounds',
    body: 'Lawns, landscaped gardens and field edges for portraits, arrivals and slow moments.',
    image: '/media/estate/estate-aerial.webp',
    alt: 'Aerial view of the gardens, marquee and fields at Swarling Manor',
  },
];

const eventPhotoOrder = [
  27, 2, 33, 14, 29, 6, 38, 4, 22, 13, 35, 19, 8, 40, 24, 31, 11, 37, 5, 30, 17,
  39, 1, 28, 15, 34, 9, 26, 20, 36, 3, 25, 12, 32, 7, 23, 16, 41, 10, 21, 18,
];

const eventPhotos = eventPhotoOrder.map((photoNumber, index) => ({
  src: `/media/white-bloom/event/event-${String(photoNumber).padStart(2, '0')}.webp`,
  alt: `Family event photograph ${index + 1} at Swarling Manor on July 12, 2026`,
}));

const venuePhotos = Array.from({ length: 24 }, (_, index) => ({
  src: `/media/white-bloom/venue/venue-${String(index + 1).padStart(2, '0')}.webp`,
  alt: `Swarling Manor venue photograph ${index + 1}`,
}));

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [Quiz],
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') private heroVideo?: ElementRef<HTMLVideoElement>;
  @ViewChildren('motionVideo') private motionVideos?: QueryList<ElementRef<HTMLVideoElement>>;

  protected readonly menuOpen = signal(false);
  protected readonly activeDropdown = signal<string | null>(null);
  protected readonly photoMotionPaused = signal(false);
  protected readonly headerScrolled = signal(false);
  protected readonly quizOpen = signal(false);
  protected readonly navGroups = navGroups;
  protected readonly occasionCards = occasionCards;
  protected readonly spaces = spaces;
  protected readonly eventPhotos = eventPhotos;
  protected readonly venuePhotos = venuePhotos;

  private revealObserver?: IntersectionObserver;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const reduceMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const videos = [
      this.heroVideo,
      ...(this.motionVideos?.toArray() ?? []),
    ]
      .map((videoRef) => videoRef?.nativeElement)
      .filter((video): video is HTMLVideoElement => Boolean(video));

    for (const video of videos) {
      video.muted = true;
      video.defaultMuted = true;
    }

    if (!reduceMotion) {
      for (const video of videos) {
        const playRequest = video.play();
        if (playRequest && typeof playRequest.catch === 'function') {
          void playRequest.catch(() => undefined);
        }
      }
    }

    this.setUpReveals(reduceMotion);

    if (typeof window !== 'undefined' && window.location.hash === '#plan') {
      this.openQuiz();
    }
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.setBodyScrollLock(false);
  }

  private setUpReveals(reduceMotion: boolean): void {
    const targets = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      for (const target of targets) {
        target.classList.add('is-visible');
      }
      return;
    }

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.revealObserver?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );

    for (const target of targets) {
      this.revealObserver.observe(target);
    }
  }

  private setBodyScrollLock(locked: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.activeDropdown.set(null);
    this.setBodyScrollLock(this.menuOpen());
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.activeDropdown.set(null);
    this.setBodyScrollLock(false);
  }

  protected toggleDropdown(label: string): void {
    this.activeDropdown.update((current) => (current === label ? null : label));
  }

  protected closeDropdown(): void {
    this.activeDropdown.set(null);
  }

  protected togglePhotoMotion(): void {
    this.photoMotionPaused.update((paused) => !paused);
  }

  protected openQuiz(): void {
    this.closeMenu();
    this.quizOpen.set(true);
    this.setBodyScrollLock(true);
  }

  protected onQuizClosed(): void {
    this.quizOpen.set(false);
    this.setBodyScrollLock(false);
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.headerScrolled.set(window.scrollY > 24);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (this.activeDropdown() === null || this.menuOpen()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.nav-dropdown')) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }
}
