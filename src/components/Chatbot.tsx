import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  ArrowLeft,
  Utensils,
  Bed,
  Crown,
  Wrench,
  AlertTriangle,
  Building,
  ConciergeBell,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Option {
  label: string;
  value: string;
}

interface Message {
  id: number;
  type: 'bot' | 'user';
  text: string;
  options?: Option[];
}

type Workflow =
  | 'main'
  | 'booking'
  | 'pricing'
  | 'restaurant'
  | 'facilities'
  | 'emergency'
  | 'complaints'
  | 'reception';

// ─── Constants ───────────────────────────────────────────────────────────────

const GOLD = '#D4AF37';
const GOLD_BORDER = '1px solid rgba(212, 175, 55, 0.4)';
const GOLD_BG_HOVER = 'rgba(212, 175, 55, 0.1)';

const ROOM_CATEGORIES = ['Deluxe', 'Royal', 'Presidential'];
const DINING_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Desserts', 'Beverages'];
const FACILITY_NAMES = ['Swimming Pool', 'Spa', 'Gym', 'Rooftop Lounge', 'Valet Parking'];
const EMERGENCY_TYPES = ['Fire Exit', 'Medical Emergency', 'Security Help', 'Lost Item', 'Navigation Help'];
const ISSUE_TYPES = ['AC Problem', 'Water Leakage', 'WiFi Problem', 'Cleaning Required', 'TV Not Working', 'Other'];
const RECEPTION_SERVICES = ['Airport Pickup', 'Wake-up Call', 'Extend Stay', 'Late Checkout', 'General Support'];

const MAIN_MENU_OPTIONS: Option[] = [
  { label: 'Room Availability & Booking', value: 'booking' },
  { label: 'Room Pricing & Features', value: 'pricing' },
  { label: 'Restaurant & Food Menu', value: 'restaurant' },
  { label: 'Hotel Facilities & Timings', value: 'facilities' },
  { label: 'Emergency & Navigation Help', value: 'emergency' },
  { label: 'Complaints & Maintenance', value: 'complaints' },
  { label: 'Talk to Reception', value: 'reception' },
];

const MAIN_MENU_ICONS: Record<string, React.ReactNode> = {
  booking: <Bed className="w-4 h-4" style={{ color: GOLD }} />,
  pricing: <Crown className="w-4 h-4" style={{ color: GOLD }} />,
  restaurant: <Utensils className="w-4 h-4" style={{ color: GOLD }} />,
  facilities: <Building className="w-4 h-4" style={{ color: GOLD }} />,
  emergency: <AlertTriangle className="w-4 h-4" style={{ color: GOLD }} />,
  complaints: <Wrench className="w-4 h-4" style={{ color: GOLD }} />,
  reception: <ConciergeBell className="w-4 h-4" style={{ color: GOLD }} />,
};

// ─── Helper ──────────────────────────────────────────────────────────────────

let nextId = 1;
const msgId = () => nextId++;

const HOTEL_OUT_OF_CONTEXT =
  'This chatbot only assists with WildWings hotel services. Please ask hotel related questions.';

const isHotelRelated = (text: string): boolean => {
  const lower = text.toLowerCase();
  const hotelKeywords = [
    'room', 'book', 'booking', 'deluxe', 'royal', 'presidential', 'price', 'pricing',
    'menu', 'food', 'dining', 'breakfast', 'lunch', 'dinner', 'dessert', 'beverage',
    'facility', 'pool', 'spa', 'gym', 'lounge', 'valet', 'parking',
    'emergency', 'fire', 'medical', 'security', 'lost', 'navigation',
    'complaint', 'maintenance', 'ac', 'water', 'wifi', 'cleaning', 'tv',
    'reception', 'airport', 'pickup', 'wake-up', 'checkout', 'extend',
    'hotel', 'wildwings', 'stay', 'reserve', 'whatsapp', 'guest',
    'yes', 'no', 'back', 'help', 'hello', 'hi',
  ];
  return hotelKeywords.some((k) => lower.includes(k));
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [workflow, setWorkflow] = useState<Workflow>('main');
  const [step, setStep] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Workflow data accumulators
  const [bookingData, setBookingData] = useState<Record<string, any>>({});
  const [complaintData, setComplaintData] = useState<Record<string, any>>({});
  const [receptionData, setReceptionData] = useState<Record<string, any>>({});
  const [diningData, setDiningData] = useState<Record<string, any>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus input when text input is needed ─────────────────────────────────
  useEffect(() => {
    if (isOpen && inputRef.current && !loading) {
      inputRef.current.focus();
    }
  }, [isOpen, step, loading]);

  // ── Add message helper ───────────────────────────────────────────────────
  const addBotMessage = useCallback(
    (text: string, options?: Option[]) => {
      setMessages((prev) => [...prev, { id: msgId(), type: 'bot', text, options }]);
    },
    [],
  );

  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: msgId(), type: 'user', text }]);
  }, []);

  // ── Reset to main menu ───────────────────────────────────────────────────
  const resetToMain = useCallback(() => {
    setWorkflow('main');
    setStep(0);
    setBookingData({});
    setComplaintData({});
    setReceptionData({});
    setDiningData({});
    addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
  }, [addBotMessage]);

  // ── Initialize on open ───────────────────────────────────────────────────
  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      addBotMessage(
        "Hey, I am Krishna! How can I help you?",
        MAIN_MENU_OPTIONS,
      );
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // ── Option click handler ─────────────────────────────────────────────────
  const handleOptionClick = useCallback(
    (value: string) => {
      addUserMessage(value);

      if (workflow === 'main') {
        handleMainMenu(value);
      } else {
        handleWorkflowStep(value);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflow, step, bookingData, complaintData, receptionData, diningData],
  );

  // ── Text input submit ────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addUserMessage(trimmed);
    setInput('');

    if (workflow === 'main') {
      if (!isHotelRelated(trimmed)) {
        addBotMessage(HOTEL_OUT_OF_CONTEXT);
        return;
      }
      addBotMessage('Please select an option from the menu below.', MAIN_MENU_OPTIONS);
      return;
    }

    handleWorkflowStep(trimmed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, workflow, step, bookingData, complaintData, receptionData, diningData]);

  // ── Main menu router ─────────────────────────────────────────────────────
  const handleMainMenu = (value: string) => {
    const wf = value as Workflow;
    setWorkflow(wf);
    setStep(1);

    switch (wf) {
      case 'booking':
        addBotMessage('Select room category:', ROOM_CATEGORIES.map((c) => ({ label: c, value: c })));
        break;
      case 'pricing':
        addBotMessage('Select room category:', ROOM_CATEGORIES.map((c) => ({ label: c, value: c })));
        break;
      case 'restaurant':
        addBotMessage('Select dining category:', DINING_CATEGORIES.map((c) => ({ label: c, value: c })));
        break;
      case 'facilities':
        addBotMessage('Select facility:', FACILITY_NAMES.map((f) => ({ label: f, value: f })));
        break;
      case 'emergency':
        addBotMessage('What type of emergency assistance?', EMERGENCY_TYPES.map((t) => ({ label: t, value: t })));
        break;
      case 'complaints':
        addBotMessage('Please enter your room number:');
        break;
      case 'reception':
        addBotMessage('What assistance do you need?', RECEPTION_SERVICES.map((s) => ({ label: s, value: s })));
        break;
      default:
        resetToMain();
    }
  };

  // ── Workflow step handler ────────────────────────────────────────────────
  const handleWorkflowStep = useCallback(
    async (value: string) => {
      switch (workflow) {
        // ──────────────────────────────────────────────────────────────────
        // WORKFLOW 1: ROOM BOOKING
        // ──────────────────────────────────────────────────────────────────
        case 'booking':
          // Handle retry
          if (value === 'retry') {
            setStep(1);
            addBotMessage('Select room category:', ROOM_CATEGORIES.map((c) => ({ label: c, value: c })));
            break;
          }
          await handleBookingWorkflow(value);
          break;

        // ──────────────────────────────────────────────────────────────────
        // WORKFLOW 2: ROOM PRICING
        // ──────────────────────────────────────────────────────────────────
        case 'pricing':
          await handlePricingWorkflow(value);
          break;

        // ──────────────────────────────────────────────────────────────────
        // WORKFLOW 3: RESTAURANT
        // ──────────────────────────────────────────────────────────────────
        case 'restaurant':
          await handleRestaurantWorkflow(value);
          break;

        // ──────────────────────────────────────────────────────────────────
        // WORKFLOW 4: FACILITIES
        // ──────────────────────────────────────────────────────────────────
        case 'facilities':
          await handleFacilitiesWorkflow(value);
          break;

        // ──────────────────────────────────────────────────────────────────
        // WORKFLOW 5: EMERGENCY
        // ──────────────────────────────────────────────────────────────────
        case 'emergency':
          await handleEmergencyWorkflow(value);
          break;

        // ──────────────────────────────────────────────────────────────────
        // WORKFLOW 6: COMPLAINTS
        // ──────────────────────────────────────────────────────────────────
        case 'complaints':
          await handleComplaintsWorkflow(value);
          break;

        // ──────────────────────────────────────────────────────────────────
        // WORKFLOW 7: RECEPTION
        // ──────────────────────────────────────────────────────────────────
        case 'reception':
          await handleReceptionWorkflow(value);
          break;

        default:
          resetToMain();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflow, step, bookingData, complaintData, receptionData, diningData],
  );

  // ── WORKFLOW 1: Booking ──────────────────────────────────────────────────
  const handleBookingWorkflow = async (value: string) => {
    const s = step;

    if (s === 1) {
      // Category selected
      setBookingData((prev) => ({ ...prev, category: value }));
      setStep(2);
      setLoading(true);
      try {
        const rooms = await api.getAvailableRooms(value);
        setLoading(false);
        if (rooms && rooms.length > 0) {
          const roomOptions = rooms.map((r: any) => ({
            label: `Room ${r.room_number} - $${r.price_per_night || r.price}/night`,
            value: r.room_number,
          }));
          // Store rooms for later reference
          setBookingData((prev) => ({ ...prev, availableRooms: rooms }));
          addBotMessage(
            `Available ${value} rooms. Please select a room:`,
            roomOptions,
          );
        } else {
          const others = ROOM_CATEGORIES.filter((c) => c !== value);
          addBotMessage(
            `No ${value} rooms are currently available. Would you like to check ${others.join(' or ')} rooms?`,
            [
              ...others.map((c) => ({ label: c, value: c })),
              { label: 'No, thanks', value: 'no' },
            ],
          );
          setStep(1);
        }
      } catch {
        setLoading(false);
        addBotMessage('We could not fetch room data right now. Please try again or contact our reception at extension 0.', [
          { label: 'Back to Menu', value: 'back' },
        ]);
      }
      return;
    }

    if (s === 2) {
      if (value === 'no') {
        addBotMessage('Thank you for visiting WildWings Premium Hotel.');
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
        setBookingData({});
        return;
      }
      // Room number selected
      const selectedRoom = (bookingData.availableRooms || []).find(
        (r: any) => r.room_number === value,
      );
      if (selectedRoom) {
        setBookingData((prev) => ({
          ...prev,
          selectedRoomId: selectedRoom.id,
          selectedRoomNumber: selectedRoom.room_number,
        }));
        addBotMessage(
          `You selected Room ${selectedRoom.room_number} (${bookingData.category}) at $${selectedRoom.price_per_night || selectedRoom.price}/night.\n\nPlease enter your WhatsApp number:`,
        );
        setStep(3);
      } else {
        addBotMessage('Room selection not found. Please try again.', [
          { label: 'Back to Menu', value: 'back' },
        ]);
      }
      return;
    }

    if (s === 3) {
      // WhatsApp number received
      setBookingData((prev) => ({ ...prev, whatsapp_number: value }));
      setStep(4);
      setLoading(true);
      try {
        await api.createBooking({
          room_id: bookingData.selectedRoomId,
          room_number: bookingData.selectedRoomNumber,
          category: bookingData.category,
          whatsapp_number: value,
          status: 'pending',
        });
        setLoading(false);
        addBotMessage(
          'Thank you for booking. Our manager will contact you shortly on WhatsApp. Enjoy your stay at WildWings Premium Hotel.',
        );
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
        setBookingData({});
      } catch {
        setLoading(false);
        addBotMessage(
          'We could not process your booking right now. Please try again or contact our reception at extension 0.',
          [
            { label: 'Try Again', value: 'retry' },
            { label: 'Back to Menu', value: 'back' },
          ],
        );
      }
      return;
    }
  };

  // ── WORKFLOW 2: Pricing ─────────────────────────────────────────────────
  const handlePricingWorkflow = async (value: string) => {
    const s = step;

    if (s === 1) {
      // Category selected
      setLoading(true);
      try {
        const rooms = await api.getRooms();
        setLoading(false);
        const filtered = rooms.filter((r: any) => r.category === value);
        if (filtered.length > 0) {
          const info = filtered
            .map(
              (r: any) =>
                `Room ${r.room_number} - ${r.category}\n  Price: $${r.price}/night\n  Features: ${r.features || 'Standard amenities'}\n  Cancellation: Free cancellation up to 24 hours before check-in`,
            )
            .join('\n\n');
          addBotMessage(`Here are the ${value} room details:\n\n${info}\n\nWould you like to check room availability?`, [
            { label: 'Yes, Check Availability', value: 'yes' },
            { label: 'No, Thanks', value: 'no' },
          ]);
          setStep(2);
        } else {
          addBotMessage(`No ${value} rooms found. Would you like to check another category?`, [
            ...ROOM_CATEGORIES.map((c) => ({ label: c, value: c })),
            { label: 'Back to Menu', value: 'back' },
          ]);
        }
      } catch {
        setLoading(false);
        addBotMessage('Could not fetch room data. Please try again later.', [
          { label: 'Back to Menu', value: 'back' },
        ]);
      }
      return;
    }

    if (s === 2) {
      if (value === 'yes') {
        // Redirect to booking workflow
        setWorkflow('booking');
        setStep(1);
        setBookingData({ category: '' });
        addBotMessage('Select room category for booking:', ROOM_CATEGORIES.map((c) => ({ label: c, value: c })));
      } else {
        addBotMessage('Thank you for visiting WildWings Premium Hotel.');
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
      }
      return;
    }
  };

  // ── WORKFLOW 3: Restaurant ──────────────────────────────────────────────
  const handleRestaurantWorkflow = async (value: string) => {
    const s = step;

    if (s === 1) {
      // Dining category selected
      setDiningData((prev) => ({ ...prev, dining_category: value }));
      setStep(2);
      setLoading(true);
      try {
        const items = await api.getMenuByCategory(value);
        setLoading(false);
        if (items && items.length > 0) {
          const menuList = items
            .map((item: any) => {
              const avail = item.is_available ? 'Available' : 'Currently Unavailable';
              return `${item.name} - $${item.price} (${avail})`;
            })
            .join('\n');
          addBotMessage(`Here is our ${value} menu:\n\n${menuList}\n\nWould you like to reserve a dining table?`, [
            { label: 'Yes, Reserve Table', value: 'yes' },
            { label: 'No, Thanks', value: 'no' },
          ]);
        } else {
          addBotMessage(`No items found for ${value}. Please try another category.`, [
            ...DINING_CATEGORIES.map((c) => ({ label: c, value: c })),
            { label: 'Back to Menu', value: 'back' },
          ]);
          setStep(1);
        }
      } catch {
        setLoading(false);
        addBotMessage('Could not fetch menu data. Please try again later.', [
          { label: 'Back to Menu', value: 'back' },
        ]);
      }
      return;
    }

    if (s === 2) {
      if (value === 'no') {
        addBotMessage('Thank you for visiting WildWings Premium Hotel.');
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
        setDiningData({});
        return;
      }
      setStep(3);
      addBotMessage('Please enter the number of guests:');
      return;
    }

    if (s === 3) {
      setDiningData((prev) => ({ ...prev, guest_count: parseInt(value, 10) || 1 }));
      setStep(4);
      addBotMessage('Please enter your preferred dining time (e.g., 7:00 PM):');
      return;
    }

    if (s === 4) {
      setDiningData((prev) => ({ ...prev, timing: value }));
      setStep(5);
      addBotMessage('Please enter your WhatsApp number:');
      return;
    }

    if (s === 5) {
      setLoading(true);
      try {
        await api.createDiningReservation({
          guest_count: diningData.guest_count,
          dining_category: diningData.dining_category,
          timing: diningData.timing,
          whatsapp_number: value,
          status: 'pending',
        });
        setLoading(false);
        addBotMessage(
          'Your dining table has been reserved! Our team will confirm the details shortly. Enjoy your meal at WildWings Premium Hotel.',
        );
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
        setDiningData({});
      } catch {
        setLoading(false);
        addBotMessage('Reservation failed. Please try again later.', [
          { label: 'Back to Menu', value: 'back' },
        ]);
      }
      return;
    }
  };

  // ── WORKFLOW 4: Facilities ──────────────────────────────────────────────
  const handleFacilitiesWorkflow = async (value: string) => {
    const s = step;

    if (s === 1) {
      setLoading(true);
      try {
        const facilities = await api.getFacilities();
        setLoading(false);
        const facility = facilities.find(
          (f: any) => f.name && f.name.toLowerCase() === value.toLowerCase(),
        );
        if (facility) {
          const info = [
            facility.name,
            `Timing: ${facility.timing || facility.hours || 'Please inquire at reception'}`,
            `Location: ${facility.location || 'Please inquire at reception'}`,
            `Rules: ${facility.rules || facility.description || 'Standard hotel rules apply'}`,
            `Availability: ${facility.is_available !== false ? 'Available' : 'Currently Unavailable'}`,
          ].join('\n');
          addBotMessage(`${info}\n\nWould you like navigation assistance?`, [
            { label: 'Yes, Show Directions', value: 'yes' },
            { label: 'No, Thanks', value: 'no' },
          ]);
          setStep(2);
        } else {
          addBotMessage('Facility details not found. Please try another selection.', [
            ...FACILITY_NAMES.map((f) => ({ label: f, value: f })),
            { label: 'Back to Menu', value: 'back' },
          ]);
        }
      } catch {
        setLoading(false);
        addBotMessage('Could not fetch facility data. Please try again later.', [
          { label: 'Back to Menu', value: 'back' },
        ]);
      }
      return;
    }

    if (s === 2) {
      if (value === 'yes') {
        addBotMessage(
          'Please head to the main lobby and follow the signage for your selected facility. Our staff at the front desk can also provide a printed map. If you need further help, please call reception at ext. 0.',
        );
      }
      addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
      setWorkflow('main');
      setStep(0);
      return;
    }
  };

  // ── WORKFLOW 5: Emergency ───────────────────────────────────────────────
  const handleEmergencyWorkflow = async (value: string) => {
    const s = step;

    if (s === 1) {
      setLoading(true);
      try {
        const info = await api.getEmergencyByType(value);
        setLoading(false);
        if (info && info.length > 0) {
          const details = info
            .map((e: any) => {
              const lines = [e.title || e.type || value];
              if (e.directions) lines.push(`Directions: ${e.directions}`);
              if (e.contacts) lines.push(`Contacts: ${e.contacts}`);
              if (e.instructions) lines.push(`Instructions: ${e.instructions}`);
              if (e.phone) lines.push(`Phone: ${e.phone}`);
              return lines.join('\n');
            })
            .join('\n\n');
          addBotMessage(`${details}\n\nStay safe. If you need further assistance, please call the front desk immediately.`);
        } else {
          addBotMessage(
            `For ${value}, please contact the front desk immediately at extension 0 or dial 911 for external emergencies. Our staff is available 24/7 to assist you.`,
          );
        }
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
      } catch {
        setLoading(false);
        addBotMessage(
          `For ${value}, please contact the front desk immediately at extension 0. Our staff is available 24/7.`,
        );
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
      }
      return;
    }
  };

  // ── WORKFLOW 6: Complaints ──────────────────────────────────────────────
  const handleComplaintsWorkflow = async (value: string) => {
    const s = step;

    if (s === 1) {
      // Room number
      setComplaintData((prev) => ({ ...prev, room_number: value }));
      setStep(2);
      addBotMessage('Select issue type:', ISSUE_TYPES.map((t) => ({ label: t, value: t })));
      return;
    }

    if (s === 2) {
      setComplaintData((prev) => ({ ...prev, issue_type: value }));
      setStep(3);
      addBotMessage('Please briefly describe the issue:');
      return;
    }

    if (s === 3) {
      setLoading(true);
      try {
        await api.createComplaint({
          room_number: complaintData.room_number,
          issue_type: complaintData.issue_type,
          description: value,
          status: 'pending',
        });
        setLoading(false);
        addBotMessage('Complaint registered successfully. Technician is arriving in 10 minutes.');
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
        setComplaintData({});
      } catch {
        setLoading(false);
        addBotMessage('Failed to register complaint. Please try again or contact reception directly.', [
          { label: 'Back to Menu', value: 'back' },
        ]);
      }
      return;
    }
  };

  // ── WORKFLOW 7: Reception ──────────────────────────────────────────────
  const handleReceptionWorkflow = async (value: string) => {
    const s = step;

    if (s === 1) {
      // Service type selected
      setReceptionData((prev) => ({ ...prev, service_type: value }));
      setStep(2);
      addBotMessage('Please enter your name:');
      return;
    }

    if (s === 2) {
      setReceptionData((prev) => ({ ...prev, guest_name: value }));
      setStep(3);
      addBotMessage('Please enter your room number:');
      return;
    }

    if (s === 3) {
      setReceptionData((prev) => ({ ...prev, room_number: value }));
      setStep(4);
      addBotMessage('Please enter your WhatsApp number:');
      return;
    }

    if (s === 4) {
      setReceptionData((prev) => ({ ...prev, whatsapp_number: value }));
      setStep(5);
      addBotMessage('Please provide any additional details for your request:');
      return;
    }

    if (s === 5) {
      setLoading(true);
      try {
        await api.createReceptionService({
          service_type: receptionData.service_type,
          guest_name: receptionData.guest_name,
          room_number: receptionData.room_number,
          whatsapp_number: receptionData.whatsapp_number,
          details: value,
          status: 'pending',
        });
        setLoading(false);
        addBotMessage(
          `Your ${receptionData.service_type} request has been submitted. Our reception team will assist you shortly. Thank you for choosing WildWings Premium Hotel.`,
        );
        addBotMessage('How can I assist you today?', MAIN_MENU_OPTIONS);
        setWorkflow('main');
        setStep(0);
        setReceptionData({});
      } catch {
        setLoading(false);
        addBotMessage('Failed to submit request. Please try again or contact reception directly.', [
          { label: 'Back to Menu', value: 'back' },
        ]);
      }
      return;
    }
  };

  // ── Back button handler ─────────────────────────────────────────────────
  const handleBack = () => {
    if (workflow === 'main') return;
    addUserMessage('Back to Menu');
    resetToMain();
  };

  // ── Keyboard handler ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating Chef Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="chatbot-fab"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: [0, -12, 0],
            }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{
              scale: { type: 'spring', stiffness: 260, damping: 20 },
              opacity: { duration: 0.3 },
              y: {
                delay: 1,
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
            className="fixed bottom-6 left-6 z-50 flex flex-col items-center cursor-pointer"
            onClick={handleOpen}
          >
            {/* Speech bubble */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mb-2 px-4 py-2 rounded-2xl rounded-bl-sm text-xs font-medium tracking-wide whitespace-nowrap shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #B8941F)`,
                color: '#0a0a0a',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Hey, I am Krishna!
            </motion.div>

            {/* Chef avatar - premium animated character */}
            <motion.button
              whileHover={{ scale: 1.1, boxShadow: `0 0 40px rgba(212, 175, 55, 0.7)` }}
              whileTap={{ scale: 0.9 }}
              className="w-20 h-20 rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: `radial-gradient(circle at 40% 35%, #2a2a2a, #0a0a0a)`,
                border: `3px solid rgba(212, 175, 55, 0.5)`,
                boxShadow: `0 8px 32px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
            >
              {/* Animated Premium Chef Character */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg viewBox="0 0 100 120" width="56" height="68" className="drop-shadow-lg">
                  {/* Chef Hat - white puffed */}
                  <defs>
                    <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#f5f5f5" />
                    </linearGradient>
                    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f4d4b8" />
                      <stop offset="100%" stopColor="#e8b895" />
                    </linearGradient>
                    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8B6F47" />
                      <stop offset="100%" stopColor="#6B5535" />
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
                    </filter>
                  </defs>

                  {/* Hat puffs - animated bobbing */}
                  <motion.g
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {/* Left puff */}
                    <ellipse cx="30" cy="12" rx="8" ry="10" fill="url(#hatGrad)" filter="url(#shadow)" />
                    {/* Center puff - tallest */}
                    <ellipse cx="50" cy="8" rx="10" ry="12" fill="url(#hatGrad)" filter="url(#shadow)" />
                    {/* Right puff */}
                    <ellipse cx="70" cy="12" rx="8" ry="10" fill="url(#hatGrad)" filter="url(#shadow)" />
                    {/* Hat band */}
                    <rect x="15" y="24" width="70" height="4" rx="2" fill="#d4af37" filter="url(#shadow)" />
                  </motion.g>

                  {/* Hair - wavy brown strands */}
                  <motion.g
                    animate={{ y: [0, -1, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {/* Left hair side */}
                    <path d="M 28 28 Q 22 35 20 45" stroke="#6B5535" strokeWidth="3" fill="none" strokeLinecap="round" />
                    {/* Right hair side */}
                    <path d="M 72 28 Q 78 35 80 45" stroke="#6B5535" strokeWidth="3" fill="none" strokeLinecap="round" />
                    {/* Hair bangs - slightly wavy */}
                    <path d="M 35 30 Q 35 38 36 45" stroke="#7B6545" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
                    <path d="M 50 28 Q 50 38 50 45" stroke="#8B6F47" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
                    <path d="M 65 30 Q 65 38 64 45" stroke="#7B6545" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
                  </motion.g>

                  {/* Face - warm skin tone */}
                  <motion.g
                    animate={{ y: [0, -0.5, 0] }}
                    transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ellipse cx="50" cy="52" rx="18" ry="19" fill="url(#skinGrad)" filter="url(#shadow)" />

                    {/* Left ear */}
                    <ellipse cx="32" cy="50" rx="4" ry="6" fill="#f4d4b8" />
                    <ellipse cx="32" cy="50" rx="2.5" ry="4" fill="#e8b895" />

                    {/* Right ear */}
                    <ellipse cx="68" cy="50" rx="4" ry="6" fill="#f4d4b8" />
                    <ellipse cx="68" cy="50" rx="2.5" ry="4" fill="#e8b895" />

                    {/* Rosy cheeks */}
                    <circle cx="24" cy="55" r="4" fill="#ff9a76" opacity="0.4" />
                    <circle cx="76" cy="55" r="4" fill="#ff9a76" opacity="0.4" />

                    {/* Left eye */}
                    <ellipse cx="40" cy="48" rx="2.5" ry="3.5" fill="#2c1810" />
                    <ellipse cx="40.5" cy="47" rx="1" ry="1.2" fill="#ffffff" />

                    {/* Right eye */}
                    <ellipse cx="60" cy="48" rx="2.5" ry="3.5" fill="#2c1810" />
                    <ellipse cx="60.5" cy="47" rx="1" ry="1.2" fill="#ffffff" />

                    {/* Eyebrows */}
                    <path d="M 36 44 Q 40 43 44 44" stroke="#6B5535" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                    <path d="M 56 44 Q 60 43 64 44" stroke="#6B5535" strokeWidth="1.2" fill="none" strokeLinecap="round" />

                    {/* Animated smile */}
                    <motion.path
                      d="M 42 62 Q 50 68 58 62"
                      stroke="#c85a54"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      animate={{ d: ['M 42 62 Q 50 68 58 62', 'M 42 62 Q 50 70 58 62', 'M 42 62 Q 50 68 58 62'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </motion.g>

                  {/* Shoulders & Shirt - blue chef coat */}
                  <motion.g
                    animate={{ y: [0, -0.5, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <rect x="32" y="70" width="36" height="16" rx="4" fill="#5B8FD4" filter="url(#shadow)" />
                    {/* Buttons */}
                    <circle cx="50" cy="75" r="1.2" fill="#d4af37" />
                    <circle cx="50" cy="81" r="1.2" fill="#d4af37" />
                  </motion.g>
                </svg>

                {/* Floating animation indicator - subtle dots */}
                <motion.div
                  className="absolute -bottom-1 flex gap-1"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-1 h-1 rounded-full" style={{ background: GOLD }} />
                  <div className="w-1 h-1 rounded-full" style={{ background: GOLD }} />
                </motion.div>
              </div>

              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${GOLD}` }}
                animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeOut' }}
              />
              {/* Second glow ring offset */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `1.5px solid ${GOLD}` }}
                animate={{ scale: [1, 1.35], opacity: [0.3, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeOut', delay: 0.8 }}
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chatbot Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chatbot-panel"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-4 left-4 z-50 flex flex-col w-[90vw] max-w-[420px] h-[80vh] max-h-[700px] rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: `1px solid rgba(212, 175, 55, 0.25)`,
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{
                borderBottom: `1px solid rgba(212, 175, 55, 0.2)`,
                background: `linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))`,
              }}
            >
              <div className="flex items-center gap-3">
                {workflow !== 'main' && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleBack}
                    className="p-1 rounded-md cursor-pointer"
                    style={{ color: GOLD }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </motion.button>
                )}
                <div>
                  <h2
                    className="text-base font-bold tracking-wide"
                    style={{ color: GOLD, fontFamily: "'Playfair Display', serif" }}
                  >
                    Krishna - Your Concierge
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(212, 175, 55, 0.6)' }}>
                    WildWings Premium Hotel
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="p-1.5 rounded-md cursor-pointer"
                style={{ color: GOLD }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* ── Messages Area ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: 0 }}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                      msg.type === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                    }`}
                    style={
                      msg.type === 'user'
                        ? {
                            background: `linear-gradient(135deg, ${GOLD}, #B8941F)`,
                            color: '#0a0a0a',
                            fontWeight: 500,
                          }
                        : {
                            backgroundColor: 'rgba(212, 175, 55, 0.08)',
                            border: `1px solid rgba(212, 175, 55, 0.2)`,
                            color: '#e5e5e5',
                          }
                    }
                  >
                    {msg.text}

                    {/* Option buttons */}
                    {msg.options && msg.options.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.options.map((opt) => {
                          const isMainOption = workflow === 'main' || (msg.type === 'bot' && step === 0);
                          const icon = isMainOption ? MAIN_MENU_ICONS[opt.value] : null;

                          return (
                            <motion.button
                              key={opt.value}
                              whileHover={{ scale: 1.02, backgroundColor: GOLD_BG_HOVER }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleOptionClick(opt.value)}
                              disabled={loading}
                              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                              style={{
                                border: GOLD_BORDER,
                                backgroundColor: 'transparent',
                                color: '#e5e5e5',
                              }}
                            >
                              {icon && <span className="shrink-0">{icon}</span>}
                              <span className="flex-1">{opt.label}</span>
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div
                    className="px-4 py-3 rounded-2xl rounded-bl-md text-sm"
                    style={{
                      backgroundColor: 'rgba(212, 175, 55, 0.08)',
                      border: `1px solid rgba(212, 175, 55, 0.2)`,
                      color: GOLD,
                    }}
                  >
                    <span className="flex items-center gap-1">
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      >
                        .
                      </motion.span>
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      >
                        .
                      </motion.span>
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      >
                        .
                      </motion.span>
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area ── */}
            <div
              className="shrink-0 px-4 py-3"
              style={{
                borderTop: `1px solid rgba(212, 175, 55, 0.2)`,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.08)',
                    border: `1px solid rgba(212, 175, 55, 0.2)`,
                    color: '#e5e5e5',
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="p-2.5 rounded-xl cursor-pointer disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD}, #B8941F)`,
                    color: '#0a0a0a',
                  }}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
