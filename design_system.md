# 🎨 WigHaven Design System
**Premium Dark Mode - Black & Gold Theme**

## Color Tokens

### Primary Colors
```css
--primary-gold: #FFD700;
--primary-gold-dark: #B8860B;
--primary-gold-light: #FFED4E;
--primary-black: #0A0A0A;
--surface-dark: #1A1A1A;
--surface-medium: #2A2A2A;
--surface-light: #3A3A3A;
```

### Semantic Colors
```css
--success: #10B981;
--error: #EF4444;
--warning: #F59E0B;
--info: #3B82F6;
```

### Text Colors
```css
--text-primary: #FFFFFF;
--text-secondary: #A0A0A0;
--text-tertiary: #6B6B6B;
```

### Glassmorphism
```css
--glass-background: rgba(26, 26, 26, 0.7);
--glass-border: rgba(255, 215, 0, 0.1);
--glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
--glass-backdrop-blur: blur(10px);
```

## Typography

**Font Family:** `'Inter', 'Roboto', sans-serif`

**Sizes:** xs(12px), sm(14px), base(16px), lg(18px), xl(20px), 2xl(24px), 3xl(30px), 4xl(36px)

**Weights:** light(300), normal(400), medium(500), semibold(600), bold(700)

## Spacing Scale
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

## Border Radius
sm(4px), md(8px), lg(12px), xl(16px), 2xl(24px), full(9999px)

## Breakpoints
- Mobile: 640px
- Tablet: 768px
- Desktop: 1024px
- Large: 1280px

## Component Styles

### Buttons
- **Primary:** Gold gradient background, black text, lift on hover
- **Secondary:** Transparent background, gold border, gold text
- **Ghost:** Transparent, gray text, subtle hover background
- **Sizes:** sm(8px 16px), md(12px 24px), lg(16px 32px)

### Inputs
- Background: `--surface-dark`, Border: `--surface-light`
- Focus: Gold border + shadow glow
- Error: Red border
- Padding: 12px 16px

### Cards
- Glassmorphism background
- Border: `--glass-border`
- Hover: Lift transform + shadow
- Padding: 24px

### Modals
- Overlay: rgba(0,0,0,0.8) + blur
- Container: `--surface-dark`, rounded 24px
- Animate: fadeIn + slideUp

### Toasts
- Position: Top-right
- Auto-dismiss: 5 seconds
- Types: success(green), error(red), warning(yellow), info(blue)

## Animations
- **Fast:** 150ms
- **Normal:** 300ms
- **Slow:** 500ms
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1)

### Keyframes
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

## Accessibility
- Min contrast ratio: 4.5:1 (AAA)
- Focus visible: 3px gold outline
- Interactive elements: Min 44x44px touch target
- Keyboard navigation: All interactive elements
- Screen reader: ARIA labels on all icons/images
