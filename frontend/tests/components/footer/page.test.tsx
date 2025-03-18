import { render, screen } from '@testing-library/react';
import Footer from '@/components/footer/page';

describe('Footer', () => {
  it('renders all navigation links', () => {
    render(<Footer />);
    
    expect(screen.getByText('About Odyssey')).toHaveAttribute('href', '/about');
    expect(screen.getByText('Website Creators')).toHaveAttribute('href', '/website-creators');
    expect(screen.getByText('Content Creators')).toHaveAttribute('href', '/content-creators');
    expect(screen.getByText('FAQ')).toHaveAttribute('href', '/faq');
  });
});