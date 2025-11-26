import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Warning, Circle } from '@phosphor-icons/react'

interface WorkflowStep {
  id: number
  label: string
  status: 'pending' | 'active' | 'complete' | 'error'
}

interface WorkflowStepperProps {
  currentStep: number
  steps: WorkflowStep[]
}

export function WorkflowStepper({ currentStep, steps }: WorkflowStepperProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${step.status === 'complete' ? 'bg-green-500 text-white' : ''}
                ${step.status === 'active' ? 'bg-primary text-primary-foreground' : ''}
                ${step.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                ${step.status === 'error' ? 'bg-destructive text-destructive-foreground' : ''}
              `}>
                {step.status === 'complete' ? (
                  <CheckCircle size={20} weight="fill" />
                ) : step.status === 'error' ? (
                  <Warning size={20} weight="fill" />
                ) : (
                  <Circle size={20} weight={step.status === 'active' ? 'fill' : 'regular'} />
                )}
              </div>
              <div className="hidden sm:block">
                <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>
                  {step.label}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${step.status === 'complete' ? 'bg-green-500' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
