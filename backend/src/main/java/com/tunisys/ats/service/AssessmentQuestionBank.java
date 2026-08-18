package com.tunisys.ats.service;

import java.util.List;
import java.util.Map;

/**
 * Banque de questions par defaut (Module 7 — E-Assessment). En V1 ce sont des
 * questions generiques codees en dur ; a terme, migrer vers une table dediee
 * (question_bank) editable par le RH depuis l'admin si le besoin de personnalisation
 * par poste devient prioritaire.
 *
 * IMPORTANT : les reponses correctes ne sont JAMAIS exposees au candidat via l'API
 * publique (voir AssessmentService.getPublicQuestions qui les retire).
 */
public class AssessmentQuestionBank {

    public record Question(String id, String text, List<String> options, int correctIndex) {}

    public static final List<Question> TECHNICAL_QCM = List.of(
            new Question("q1", "Que fait le mot-cle 'final' sur une variable en Java ?",
                    List.of("Rend la variable constante (non reassignable)", "Optimise la memoire automatiquement",
                            "Rend la variable statique", "N'a aucun effet"), 0),
            new Question("q2", "En SQL, quelle clause permet de filtrer des groupes apres un GROUP BY ?",
                    List.of("WHERE", "HAVING", "FILTER", "ON"), 1),
            new Question("q3", "Quel principe SOLID concerne le fait qu'une classe ne devrait avoir qu'une seule raison de changer ?",
                    List.of("Open/Closed", "Liskov Substitution", "Single Responsibility", "Dependency Inversion"), 2),
            new Question("q4", "Dans une architecture REST, quel code HTTP indique une ressource creee avec succes ?",
                    List.of("200", "201", "204", "301"), 1),
            new Question("q5", "Qu'est-ce qu'un 'race condition' en programmation concurrente ?",
                    List.of("Une erreur de compilation", "Un resultat qui depend de l'ordre d'execution de threads concurrents",
                            "Une boucle infinie", "Un depassement de memoire"), 1)
    );

    public static final List<Question> PERSONALITY = List.of(
            new Question("p1", "Face a un desaccord avec un collegue sur une decision technique, vous :",
                    List.of("Imposez votre point de vue si vous etes sur d'avoir raison",
                            "Cherchez a comprendre son raisonnement avant de trancher ensemble",
                            "Evitez le conflit et laissez faire", "Escaladez systematiquement au manager"), 1),
            new Question("p2", "Quand un projet prend du retard, votre premier reflexe est :",
                    List.of("Identifier les causes et re-prioriser", "Travailler plus d'heures sans changer d'approche",
                            "Attendre que la situation se resolve d'elle-meme", "Blamer les dependances externes"), 0),
            new Question("p3", "Vous preferez un environnement de travail :",
                    List.of("Tres structure avec des process stricts", "Flexible avec une large autonomie",
                            "Peu importe tant que les objectifs sont clairs", "Sans aucune contrainte de process"), 2)
    );

    public static List<Question> forType(String type) {
        return "PERSONALITY".equals(type) ? PERSONALITY : TECHNICAL_QCM;
    }

    /** Score sur 100 a partir des reponses candidat {questionId: selectedIndex}. */
    public static double score(String type, Map<String, Integer> answers) {
        List<Question> questions = forType(type);
        if (questions.isEmpty()) return 0.0;
        long correct = questions.stream()
                .filter(q -> answers.containsKey(q.id()) && answers.get(q.id()) == q.correctIndex())
                .count();
        return Math.round((correct * 100.0 / questions.size()) * 100.0) / 100.0;
    }
}
