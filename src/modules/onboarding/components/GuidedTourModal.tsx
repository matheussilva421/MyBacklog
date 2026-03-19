import { BookOpenText, ChevronLeft, ChevronRight, Eye, Sparkles } from "lucide-react";
import { NotchButton, Panel, Pill } from "../../../components/cyberpunk-ui";
import type { GuidedTourStep } from "../utils/guidedTour";

type GuidedTourModalProps = {
  open: boolean;
  step: GuidedTourStep;
  stepIndex: number;
  totalSteps: number;
  completing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onFinish: () => void;
};

export function GuidedTourModal({
  open,
  step,
  stepIndex,
  totalSteps,
  completing,
  onPrevious,
  onNext,
  onClose,
  onFinish,
}: GuidedTourModalProps) {
  if (!open) return null;

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div className="guided-tour-layer" aria-live="polite">
      <div className="guided-tour-backdrop" aria-hidden="true" />
      <div className="guided-tour-shell">
        <Panel className="guided-tour-panel">
          <div className="guided-tour">
            <div className="guided-tour__modal-head">
              <div>
                <h3>Guia rápido do Arsenal Gamer</h3>
                <p>Um tour guiado pelas telas principais para entender o sistema sem adivinhar nada.</p>
              </div>
              <NotchButton variant="ghost" onClick={onClose} disabled={completing}>
                Fechar
              </NotchButton>
            </div>

            <div className="guided-tour__meta">
              <Pill tone="cyan">
                Etapa {stepIndex + 1} de {totalSteps}
              </Pill>
              <Pill tone="neutral">{step.screen}</Pill>
            </div>

            <div className="guided-tour__head">
              <div className="guided-tour__title">
                <BookOpenText size={18} />
                <h4>{step.title}</h4>
              </div>
              <div className="guided-tour__target">
                <Eye size={15} />
                <span>Olhe para a área destacada</span>
              </div>
            </div>

            <p className="guided-tour__description">{step.description}</p>

            <div className="guided-tour__bullets">
              {step.bullets.map((bullet) => (
                <div className="guided-tour__bullet" key={bullet}>
                  <Sparkles size={14} />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="guided-tour__progress">
              {Array.from({ length: totalSteps }, (_, index) => (
                <span
                  key={`tour-step-${index + 1}`}
                  className={index === stepIndex ? "guided-tour__dot guided-tour__dot--active" : "guided-tour__dot"}
                />
              ))}
            </div>

            <div className="modal-actions">
              <NotchButton variant="ghost" onClick={onClose} disabled={completing}>
                Pular tutorial
              </NotchButton>
            <div className="guided-tour__actions">
                <NotchButton variant="secondary" onClick={onPrevious} disabled={isFirstStep || completing}>
                  <ChevronLeft size={14} />
                  Anterior
                </NotchButton>
                {isLastStep ? (
                  <NotchButton variant="primary" onClick={onFinish} disabled={completing}>
                    {completing ? "Finalizando..." : "Concluir guia"}
                  </NotchButton>
                ) : (
                  <NotchButton variant="primary" onClick={onNext} disabled={completing}>
                    Próximo
                    <ChevronRight size={14} />
                  </NotchButton>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
