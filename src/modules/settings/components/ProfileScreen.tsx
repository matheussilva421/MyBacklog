import { CheckCircle2, User } from "lucide-react";
import type { Achievement } from "../../../backlog/shared";
import { cx } from "../../../backlog/shared";
import { Panel, SectionHeader } from "../../../components/cyberpunk-ui";

type ProfileScreenProps = {
  achievementCards: Achievement[];
};

export function ProfileScreen({ achievementCards }: ProfileScreenProps) {
  return (
    <div className="profile-layout">
      <Panel>
        <SectionHeader icon={User} title="Perfil" description="Sua camada pessoal dentro do backlog OS" />
        <div className="profile-card">
          <div className="profile-card__main">
            <span>Operador</span>
            <h3>Matheus</h3>
            <p>Curadoria agressiva de backlog, foco em catálogo, progresso e estatística pessoal.</p>
          </div>
          <div className="profile-card__meta">
            <div className="detail-stat"><span>Plataforma principal</span><strong>PC</strong></div>
            <div className="detail-stat"><span>Estilo</span><strong>Backlog Planner</strong></div>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={CheckCircle2} title="Conquistas do sistema" description="Resumo de hábitos, padrões e sinalizações" />
        <div className="achievement-grid">
          {achievementCards.map((achievement) => {
            const Icon = achievement.icon;
            return (
              <article className={cx("achievement-card", `achievement-card--${achievement.tone}`)} key={achievement.title}>
                <Icon size={18} />
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
