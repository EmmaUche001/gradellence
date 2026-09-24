import { Button, Card } from '@/components/ui';
import { ArrowRight, Check, Play, TrendingUp, Award, ChevronRight, FileText, Download, Percent, Users, Shield, Star, Gift, Headphones, MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const features = [
  {
    number: "01",
    title: "Student Management",
    description: "Keep student records, enrolments, classes and academic information organised in one secure workspace.",
  },
  {
    number: "02",
    title: "Assessments & Results",
    description: "Create assessments, capture scores, calculate results and manage grading without the usual spreadsheet chaos.",
  },
  {
    number: "03",
    title: "Teachers & Classes",
    description: "Give teachers the tools they need while keeping administrators in control of classes, subjects and permissions.",
  },
  {
    number: "04",
    title: "Academic Analytics",
    description: "Turn school data into useful insights. Understand performance trends across students, classes and subjects.",
  },
  {
    number: "05",
    title: "Report Cards",
    description: "Generate professional academic reports from the data already inside your school.",
  },
  {
    number: "06",
    title: "School Administration",
    description: "Manage users, roles, sessions, grade scales, announcements, billing and system settings from one place.",
  },
];



function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
        <div className="w-4 h-4 bg-white transform rotate-45"></div>
      </div>
      <span className="text-2xl font-bold text-gray-900">Gradellence</span>
    </div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const floatingCardsRef = useRef<HTMLDivElement>(null);
  const featuresGridRef = useRef<HTMLDivElement>(null);
  const benefitsGridRef = useRef<HTMLDivElement>(null);
  const partnershipSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Hero section stagger animation
    if (heroRef.current) {
      const heroElements = heroRef.current.querySelectorAll('[data-animate]');
      gsap.fromTo(
        heroElements,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.1,
          delay: 0.2,
        }
      );
    }

    // Floating cards simultaneous slide-in
    if (floatingCardsRef.current) {
      const cards = floatingCardsRef.current.querySelectorAll('[data-float-card]');
      gsap.fromTo(
        cards,
        (index: number) => {
          // Slide from different directions based on position
          if (index === 0) return { opacity: 0, x: 40, y: 40 }; // bottom-right
          return { opacity: 0, x: -40, y: -40 }; // top-left
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          delay: 0.4,
        }
      );
    }

    // Features grid stagger on scroll using ScrollTrigger
    if (featuresGridRef.current) {
      const cards = featuresGridRef.current.querySelectorAll('[data-feature-card]');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: featuresGridRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );
    }

    // Benefits grid stagger on scroll using ScrollTrigger
    if (benefitsGridRef.current) {
      const cards = benefitsGridRef.current.querySelectorAll('[data-benefit-card]');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: benefitsGridRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );
    }

    // Partnership section parallax on scroll
    if (partnershipSectionRef.current) {
      const blobs = partnershipSectionRef.current.querySelectorAll('[data-parallax]');
      blobs.forEach((blob) => {
        gsap.to(blob, {
          y: 100,
          scrollTrigger: {
            trigger: partnershipSectionRef.current!,
            start: 'top center',
            end: 'bottom center',
            scrub: 1,
            markers: false,
          },
        });
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="#top" className="flex items-center">
              <Logo />
            </a>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
                How it works
              </a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
                Pricing
              </a>
              <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <a href="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
                Sign in
              </a>
              <a 
                href="/early-access"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-btn hover:bg-primary-700 transition-colors text-sm"
              >
                Get early access
              </a>
            </div>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background to-surface-alt">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left" ref={heroRef}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6" data-animate>
                  Limited Early Adopter Programme
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6" data-animate>
                  The smarter way to
                  <span className="block bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                    manage school results.
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl" data-animate>
                  Simplify result computation, reporting and academic performance management with Gradellence.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-6" data-animate>
                  <Button variant="primary" size="lg" className="w-full sm:w-auto hover-scale-shadow">
                    Get early access
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <a 
                    href="/docs/gradellence-early-adopter-proposal.pdf" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 border border-primary-600 text-primary-600 font-medium rounded-btn hover:bg-primary-50 transition-colors w-full sm:w-auto hover-scale-shadow"
                  >
                    <FileText className="mr-2 w-5 h-5" />
                    View partnership proposal
                  </a>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500" data-animate>
                  <Check className="w-4 h-4 text-success-500" />
                  Launching September 2026
                </div>
              </div>

              {/* Product Demo Placeholder */}
              <div className="relative" ref={floatingCardsRef}>
                <Card className="overflow-hidden border-2 border-border">
                  <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-danger-500"></div>
                      <div className="w-3 h-3 rounded-full bg-warning-500"></div>
                      <div className="w-3 h-3 rounded-full bg-success-500"></div>
                    </div>
                    <div className="text-sm font-mono text-gray-600">app.gradellence.com</div>
                  </div>
                  <div className="p-8 bg-gradient-to-br from-primary-50 to-surface-alt">
                    <div className="flex flex-col items-center justify-center text-center py-12">
                      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                        <Play className="w-8 h-8 text-primary-600 ml-1" />
                      </div>
                      <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">
                        PRODUCT DEMO VIDEO
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Your Gradellence experience goes here
                      </h3>
                      <p className="text-gray-600">
                        Replace this area with a 15–30 second product walkthrough.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Floating Cards */}
                <div className="absolute -bottom-6 -right-6 bg-surface border border-border rounded-card p-4 shadow-lg w-40" data-float-card>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Students</div>
                      <div className="text-lg font-bold text-gray-900">2,547</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-6 -left-6 bg-surface border border-border rounded-card p-4 shadow-lg w-48" data-float-card>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                      <Check className="w-5 h-5 text-success-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Results processed</div>
                      <div className="text-lg font-bold text-gray-900">96.8%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-6 text-center">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              BUILT FOR NIGERIAN PRIVATE SCHOOLS
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Designed specifically for the unique needs of Nigerian private school administration.
            </p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-12">
              <span className="text-gray-700 font-medium">School Administrators</span>
              <span className="text-gray-700 font-medium">Teachers</span>
              <span className="text-gray-700 font-medium">Academic Coordinators</span>
              <span className="text-gray-700 font-medium">School Owners</span>
            </div>
          </div>
        </section>

        {/* Intro Section */}
        <section className="py-20">
          <div className="container mx-auto px-6 text-center">
            <div className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-4">
              ONE PLATFORM
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Manage your school's results faster, more accurately and securely.
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Stop jumping between spreadsheets, documents and disconnected tools. Let Gradellence handle the result computation while you focus on what matters most - your students.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-surface-alt">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 mb-16">
              <div>
                <div className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-4">
                  FEATURES
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Built around how schools actually work.
                </h2>
              </div>
              <p className="text-lg text-gray-600">
                From student records to results and analytics, Gradellence connects the pieces of your school's academic workflow.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" ref={featuresGridRef}>
              {features.map((feature) => (
                <Card key={feature.number} hoverable className="h-full" data-feature-card>
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-3xl font-bold text-primary-100">{feature.number}</div>
                    <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Award className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-6">{feature.description}</p>
                  <a href="#early-access" className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700">
                    Explore feature
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </a>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Early Adopter Benefits Section */}
        <section id="early-adopter" className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-4">
                EARLY ADOPTER PROGRAMME
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Become a Gradellence Early Adopter
              </h2>
              <p className="text-lg text-gray-600">
                Join a limited group of schools helping us launch the next generation of school result management in Nigeria.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" ref={benefitsGridRef}>
              {[
                {
                  icon: <Percent className="w-6 h-6 text-success-600" />,
                  title: "Grandfathered pricing for life",
                  description: "Lock in your Early Adopter rate forever as we grow."
                },
                {
                  icon: <Percent className="w-6 h-6 text-success-600" />,
                  title: "20% discount for first 3 months",
                  description: "Save on your subscription costs during the critical launch period."
                },
                {
                  icon: <Users className="w-6 h-6 text-primary-600" />,
                  title: "Free onboarding & data migration",
                  description: "We'll help transition your school data at no additional cost."
                },
                {
                  icon: <FileText className="w-6 h-6 text-primary-600" />,
                  title: "Free custom report-card setup",
                  description: "Personalized report cards that match your school's branding."
                },
                {
                  icon: <Shield className="w-6 h-6 text-success-600" />,
                  title: "Future features included",
                  description: "All upcoming features at no additional cost during Early Adopter period."
                },
                {
                  icon: <Headphones className="w-6 h-6 text-primary-600" />,
                  title: "Priority support",
                  description: "Direct access to our team for any questions or issues."
                },
                {
                  icon: <Gift className="w-6 h-6 text-warning-600" />,
                  title: "Referral rewards",
                  description: "Earn rewards for referring other schools to Gradellence."
                },
                {
                  icon: <Star className="w-6 h-6 text-warning-600" />,
                  title: "School Spotlight opportunity",
                  description: "Feature your school in our marketing as an Early Adopter success story."
                },
                {
                  icon: <Check className="w-6 h-6 text-success-600" />,
                  title: "Subscription starts at launch",
                  description: "Your payment secures your spot now, subscription begins at official launch."
                }
              ].map((benefit, index) => (
                <Card key={index} className="text-center p-6" data-benefit-card>
                  <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
                    {benefit.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </Card>
              ))}
            </div>

            <div className="mt-16 text-center">
              <div className="bg-success-50 border border-success-200 rounded-card p-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Important Payment Language</h3>
                <p className="text-gray-700 mb-4">
                  <strong>Your Early Adopter payment secures your school's place in the programme.</strong> Your subscription period begins when Gradellence officially launches at the end of September 2026.
                </p>
                <p className="text-sm text-gray-600">
                  Avoid ambiguous wording like "Start your subscription today." Instead: "Secure your Early Adopter spot today."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Partnership Proposal Section */}
        <section className="py-20 bg-gradient-to-b from-blue-50 via-blue-25 to-blue-50 relative overflow-hidden" ref={partnershipSectionRef}>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100 rounded-full opacity-20 -mr-48 -mt-48" data-parallax></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100 rounded-full opacity-15 -ml-40 -mb-40" data-parallax></div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Left side - Visual element */}
                <div className="flex justify-center md:justify-start">
                  <div className="relative w-full max-w-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-400 rounded-2xl blur-2xl opacity-20"></div>
                    <Card className="relative p-8 border-2 border-primary-200 bg-white">
                      <div className="space-y-6">
                        <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-lg mx-auto">
                          <FileText className="w-8 h-8 text-primary-600" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-primary-600 uppercase tracking-wide mb-2">Partnership Proposal</div>
                          <h3 className="text-xl font-bold text-gray-900">Early Adopter Programme</h3>
                          <p className="text-gray-600 text-sm mt-3">Complete details on benefits, pricing, and timeline</p>
                        </div>
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-3 text-sm text-gray-700">
                            <span>Grandfathered pricing locked in</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-700 mt-3">
                            <span>Priority support access</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-700 mt-3">
                            <span>Exclusive feature previews</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Right side - Content */}
                <div className="text-center md:text-left">
                  <div className="inline-flex md:inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full mb-6">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-semibold">EARLY ADOPTER PROGRAMME</span>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    Your complete <span className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">partnership proposal</span>
                  </h2>
                  
                  <p className="text-lg text-gray-600 mb-8">
                    Everything you need to know about joining the Gradellence Early Adopter Programme. Get detailed information about pricing, timeline, and exclusive benefits reserved for our founding partners.
                  </p>
                  
                  <div className="flex flex-col gap-3 mb-8">
                    <a 
                      href="/docs/gradellence-early-adopter-proposal.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center md:justify-start px-8 py-4 bg-primary-600 text-white font-medium rounded-btn hover:bg-primary-700 transition-colors"
                    >
                      <FileText className="mr-2 w-5 h-5" />
                      View proposal in browser
                    </a>
                    
                    <a 
                      href="/docs/gradellence-early-adopter-proposal.pdf" 
                      download="Gradellence-Early-Adopter-Proposal.pdf"
                      className="inline-flex items-center justify-center md:justify-start px-8 py-4 border border-primary-600 text-primary-600 font-medium rounded-btn hover:bg-primary-50 transition-colors"
                    >
                      <Download className="mr-2 w-5 h-5" />
                      Download PDF
                    </a>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    The proposal opens in a new tab. No download required to view.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final Early Adopter CTA */}
        <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-400">
          <div className="container mx-auto px-6">
            <Card className="relative overflow-hidden border-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 px-4 py-2 bg-success-50 text-success-700 rounded-full w-fit mb-6 mx-auto">
                  <span className="text-sm font-semibold">LIMITED EARLY ADOPTER SLOTS</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
                  Ready to modernize your school's result management?
                </h2>

                <p className="text-lg text-gray-600 mb-8 text-center max-w-3xl mx-auto">
                  Secure your school's Early Adopter spot before Gradellence officially launches. Limited slots available.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <a 
                    href="/early-access"
                    className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-medium rounded-btn hover:bg-primary-700 transition-colors"
                  >
                    Secure my Early Adopter spot
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                  <a 
                    href="/book-demo"
                    className="inline-flex items-center justify-center px-8 py-4 border border-primary-600 text-primary-600 font-medium rounded-btn hover:bg-primary-50 transition-colors"
                  >
                    Book a demo
                  </a>
                </div>

                <p className="text-sm text-gray-500 text-center">
                  Limited Early Adopter slots available. Subscription begins at official launch.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* WhatsApp Floating Button */}
        <div className="fixed bottom-6 right-6 z-50 group">
          <a
            href="https://wa.me/234XXXXXXXXXX?text=Hi%20Gradellence%20team,%20I'm%20interested%20in%20learning%20more%20about%20the%20Early%20Adopter%20Programme."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-14 h-14 bg-success-500 text-white rounded-full shadow-lg hover:bg-success-600 transition-colors"
            aria-label="Chat with Gradellence on WhatsApp"
          >
            <MessageCircle className="w-7 h-7" />
            <span className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Chat with us
            </span>
          </a>
        </div>

        {/* Footer */}
        <footer className="py-12 bg-gray-900 text-gray-400">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <Logo />
                <p className="mt-4 text-gray-400 max-w-md">
                  Modern school management built for Nigerian private schools. 
                  Early Adopter Programme launching September 2026.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-white font-medium mb-2">Navigation</div>
                <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How it works</a>
                <a href="#early-adopter" className="text-gray-400 hover:text-white transition-colors">Early Adopter</a>
                <a href="#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</a>
              </div>

              <div className="flex flex-col gap-4">
                <div className="text-white font-medium mb-2">Get in touch</div>
                <a
                  href="https://wa.me/234XXXXXXXXXX?text=Hi%20Gradellence%20team,%20I'm%20interested%20in%20learning%20more%20about%20the%20Early%20Adopter%20Programme."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-success-400 hover:text-success-300 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </a>
                <div className="text-sm text-gray-500">
                  For questions, demo coordination, or payment assistance.
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
              <div className="mb-2">
                © {new Date().getFullYear()} Gradellence. Built for Nigerian private schools.
              </div>
              <div>
                Your school secures its Early Adopter position now. Subscription begins at official launch.
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}