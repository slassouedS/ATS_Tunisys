package com.tunisys.ats.repository;
import com.tunisys.ats.domain.InterviewSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface InterviewSlotRepository extends JpaRepository<InterviewSlot, Long> {
    List<InterviewSlot> findByInterviewerIdAndIsBookedFalse(Long interviewerId);
    List<InterviewSlot> findByIsBookedFalse();

    /** Creneaux d'un interviewer, libres et pas encore proposes a un candidat —
     *  c'est parmi ceux-la qu'il choisit lesquels proposer. */
    List<InterviewSlot> findByInterviewerIdAndIsBookedFalseAndProposedForApplicationIdIsNull(Long interviewerId);

    /** Creneaux proposes a une candidature precise, en attente du choix du candidat. */
    List<InterviewSlot> findByProposedForApplicationIdAndIsBookedFalse(Long applicationId);
}
