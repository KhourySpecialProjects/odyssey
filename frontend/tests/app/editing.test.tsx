import { render, screen } from '@testing-library/react'
import Droplet from '@/app/(editing)/draft/d/[slug]/page'
import { getDropletBySlug } from '@/lib/requests/droplet'
import { getDroplets } from '@/lib/requests/droplet'
import { getTags } from '@/lib/requests/tag'

// Mock all the required functions
jest.mock('@/lib/requests/droplet', () => ({
  getDropletBySlug: jest.fn(),
  getDroplets: jest.fn()
}))

jest.mock('@/lib/requests/tag', () => ({
  getTags: jest.fn()
}))

describe('Droplet Editing Page', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    focusArea: 'personal',
    type: 'knowledge',
    description: 'Test description',
    overview: 'Test overview',
    tags: [{ id: 1, name: 'React' }],
    learningObjectives: [{ id: 1, objective: 'Learn React' }],
    nextSteps: [{ label: 'Next Step', url: 'https://example.com' }],
    prerequisites: [{ id: 1, name: 'Prereq 1' }],
    postrequisites: [{ id: 2, name: 'Postreq 1' }],
    authorized_users: [
      { id: 1, firstName: 'John', lastName: 'Doe' }
    ]
  }

  const mockDroplets = [
    { id: 1, name: 'Droplet 1' },
    { id: 2, name: 'Droplet 2' }
  ]

  const mockTags = [
    { id: 1, name: 'React' },
    { id: 2, name: 'TypeScript' }
  ]

  beforeEach(() => {
    // Mock the getDropletBySlug function
    (getDropletBySlug as jest.Mock).mockImplementation((slug) => {
      if (slug === 'test-droplet') {
        return Promise.resolve(mockDroplet);
      }
      if (slug === 'non-existent') {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        ...mockDroplet,
        description: null,
        prerequisites: [],
        postrequisites: []
      });
    });
  });

  it('renders droplet metadata', async () => {
    await render(<Droplet params={Promise.resolve({ slug: 'test-droplet' })} />)
    
    expect(screen.getByText('Test Droplet')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Knowledge')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('renders author information', async () => {
    await render(<Droplet params={Promise.resolve({ slug: 'test-droplet' })} />)
    
    expect(screen.getByText('Author')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  beforeEach(() => {
    jest.spyOn(require('@/lib/requests/droplet'), 'getDropletBySlug')
      .mockResolvedValue(mockDroplet);
  });

  it('renders description and overview', async () => {
    await render(<Droplet params={Promise.resolve({ slug: 'test-droplet' })} />)
    
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Test overview')).toBeInTheDocument()
  })

  it('renders learning objectives', async () => {
    await render(<Droplet params={Promise.resolve({ slug: 'test-droplet' })} />)
    
    expect(screen.getByText('Learn React')).toBeInTheDocument()
  })

  it('renders next steps', async () => {
    await render(<Droplet params={Promise.resolve({ slug: 'test-droplet' })} />)
    
    expect(screen.getByText('Next Step')).toBeInTheDocument()
  })

  it('renders general info section', async () => {
    await render(<Droplet params={Promise.resolve({ slug: 'test-droplet' })} />);
    
    // Use a more flexible text matcher
    expect(screen.getByText((content) => content.toLowerCase().includes('general info'))).toBeInTheDocument();
    expect(screen.getByText((content) => 
      content.includes('Information that users will see when they view the droplet')
    )).toBeInTheDocument();
  });

  it('renders prerequisite and postrequisite selections', async () => {
    await render(<Droplet params={Promise.resolve({ slug: 'test-droplet' })} />);
    
    // Add data-testid attributes to make testing easier
    expect(screen.getByTestId('prereq-1')).toHaveTextContent('Prereq 1');
    expect(screen.getByTestId('postreq-1')).toHaveTextContent('Postreq 1');
  });

  it('handles missing droplet data', async () => {
    ;(getDropletBySlug as jest.Mock).mockResolvedValue(null)
    
    await render(<Droplet params={Promise.resolve({ slug: 'non-existent' })} />)
    expect(screen.getByText('Droplet not found')).toBeInTheDocument()
  })

  it('handles missing optional data', async () => {
    const minimalDroplet = {
      id: 1,
      name: 'Test Droplet',
      slug: 'test-droplet',
      focusArea: 'personal',
      type: 'knowledge'
    }
    ;(getDropletBySlug as jest.Mock).mockResolvedValue(minimalDroplet)
    
    await render(<Droplet params={Promise.resolve({ slug: 'test-droplet' })} />)
    expect(screen.getByTestId('droplet-name')).toHaveTextContent('Test Droplet');
    expect(screen.queryByText('Test description')).not.toBeInTheDocument()
  })
}) 