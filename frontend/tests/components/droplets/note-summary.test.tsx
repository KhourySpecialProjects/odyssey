import { NoteSummary } from '@/components/droplets/lessons/note-taking/note-summary'
import { DropletStatus, DropletType, FocusArea, HighlightColor, Tag } from '@/types'
import { PDFDocument } from 'pdf-lib'

jest.mock('pdf-lib')

describe('NoteSummary', () => {
  const mockDroplet = {
    id: 1,
    name: 'Test Droplet',
    slug: 'test-droplet',
    isHidden: false,
    focusArea: 'personal' as FocusArea,
    type: 'knowledge' as DropletType,
    tags: [{ id: 1, name: 'React' }] as Tag[],
    learningObjectives: [],
    status: "published" as DropletStatus,
    droplet_lessons: []
  };
  const mockLesson = {
    id: 1,
    name: 'Test Lesson',
    slug: 'test-lesson',
    blocks: [],
    droplets: [],
    droplet_lessons: [],
    notes: []  
  }
  const mockProps = {
    filteredHighlights: [
      {
        id: 1,
        text: 'Highlighted text',
        color: '#fff300' as HighlightColor,
        lesson: {
          id: 1,
          name: 'Test Lesson',
          slug: 'test-lesson',
          droplets: [],
          droplet_lessons: [{
            id: 123,
            orderIndex: 1,
            lesson: mockLesson
          }],
          notes: [],
          blocks: [
            {
              id: 1,
              __component: 'droplets.generic',
              content: 'Generic content',
            },
            {
              id: 2,
              __component: 'droplets.expandable',
              title: 'Expandable title',
              content: 'Expandable content',
            },
            {
              id: 3,
              __component: 'droplets.video',
              url: 'https://example.com/video',
            },
            {
              id: 4,
              __component: 'droplets.callout',
              content: 'Callout content',
              type: 'info',
              color: 'bg-sky-50',
            },
            {
              id: 5,
              __component: 'droplets.quiz',
              questions: [
                {
                  id: 1,
                  content: 'Quiz question',
                  answerOptions: [
                    { id: 1, content: 'Option 1', isCorrect: true },
                    { id: 2, content: 'Option 2', isCorrect: false },
                  ],
                },
              ],
            },
            {
              id: 6,
              __component: 'droplets.open-ended-quiz',
              questions: [
                {
                  id: 1,
                  content: 'Open ended question',
                  correctAnswer: 'Correct answer',
                },
              ],
            },
          ],
        },
        position: {start: 0, end: 0}
      }
    ],
    notes: [
      {
        id: 1,
        content: 'Test note content',
        lesson: {
          id: 1,
          name: 'Test Lesson',
          slug: 'test-lesson',
          blocks: [],
          droplets: [],
          droplet_lessons: [{
            id: 123,
            orderIndex: 1,
            lesson: mockLesson
          }],
          notes: []
        },
        enrollment: {
          id: "1",
          authorizedUser: { id: 1 },
          droplet: mockDroplet,
          viewedLessons: [],
          isComplete: false,
          rating: 5,
          notes: [],
          isFirstTime: false,
          isArchived: false
        },
        positionY: 0,
        highlight: {
          text: 'Highlighted text',
          color: '#fff300' as HighlightColor,
          position: {start: 0, end: 0}
        }
      }
    ],
    droplet: mockDroplet
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('generates PDF with correct content', async () => {
    const mockAddPage = jest.fn().mockReturnValue({
      getSize: () => ({ width: 595.28, height: 841.89 }),
      drawText: jest.fn(),
      drawRectangle: jest.fn(),
      drawLine: jest.fn()
    })

    const mockPDFDoc = {
      addPage: mockAddPage,
      save: jest.fn().mockResolvedValue(new Uint8Array())
    } as unknown as PDFDocument

    (PDFDocument.create as jest.Mock).mockResolvedValue(mockPDFDoc)

    const pdfBytes = await NoteSummary(mockProps)

    expect(PDFDocument.create).toHaveBeenCalled()
    expect(mockAddPage).toHaveBeenCalled()
    expect(mockPDFDoc.save).toHaveBeenCalled()
    expect(pdfBytes).toBeDefined()
  })
})