import { render, screen, fireEvent } from '@testing-library/react'
import { OpenEndedQuizQuestionBlock } from '@/components/droplets/lessons/open-ended-quiz-question-block'

describe('OpenEndedQuizQuestionBlock', () => {
  const mockQuestion = {
    id: 1,
    content: 'What is the capital of France?',
    correctAnswer: 'Paris'
  }

  it('renders question content', () => {
    render(<OpenEndedQuizQuestionBlock question={mockQuestion} />)
    expect(screen.getByText(mockQuestion.content)).toBeInTheDocument()
  })

  it('handles correct answer submission', () => {
    render(<OpenEndedQuizQuestionBlock question={mockQuestion} />)
    
    const input = screen.getByPlaceholderText('Type your answer here...')
    fireEvent.change(input, { target: { value: 'Paris' } })
    
    const checkButton = screen.getByText('Check Answer')
    fireEvent.click(checkButton)
    
    expect(screen.getByText(/Right/i)).toBeInTheDocument()
  })

  it('handles incorrect answer submission', () => {
    render(<OpenEndedQuizQuestionBlock question={mockQuestion} />)
    
    const input = screen.getByPlaceholderText('Type your answer here...')
    fireEvent.change(input, { target: { value: 'London' } })
    
    const checkButton = screen.getByText('Check Answer')
    fireEvent.click(checkButton)
    
    expect(screen.getByText('Not Quite')).toBeInTheDocument()
  })

  it('allows retry after incorrect answer', () => {
    render(<OpenEndedQuizQuestionBlock question={mockQuestion} />)
    
    const input = screen.getByPlaceholderText('Type your answer here...')
    fireEvent.change(input, { target: { value: 'London' } })
    
    const checkButton = screen.getByText('Check Answer')
    fireEvent.click(checkButton)
    
    const tryAgainButton = screen.getByText('Try Again')
    fireEvent.click(tryAgainButton)
    
    expect(screen.getByPlaceholderText('Type your answer here...')).toBeInTheDocument()
  })
})