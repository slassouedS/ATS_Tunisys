package com.tunisys.ats.repository;
import com.tunisys.ats.domain.Application;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByOfferIdOrderByAiScoreDesc(Long offerId);
    List<Application> findByCandidateId(Long candidateId);
    List<Application> findByAssignedRecruiterId(Long recruiterId);
    List<Application> findByAssignedTechnicalId(Long technicalId);
    List<Application> findByCurrentStage(String currentStage);
    Optional<Application> findByCandidateIdAndOfferId(Long candidateId, Long offerId);
    @Query("SELECT a.currentStage AS stage, COUNT(a) AS total FROM Application a GROUP BY a.currentStage")
    List<StageCount> countByStage();
    @Query(value = """
        SELECT AVG(EXTRACT(EPOCH FROM (decision_at - created_at)) / 86400.0)
        FROM applications
        WHERE final_decision = 'HIRED' AND decision_at IS NOT NULL
        """, nativeQuery = true)
    Double averageTimeToHireDays();
    @Query("""
        SELECT u.firstName AS firstName, u.lastName AS lastName, COUNT(a) AS total
        FROM Application a JOIN a.assignedRecruiter u
        WHERE a.finalDecision = 'HIRED'
        GROUP BY u.firstName, u.lastName
        ORDER BY COUNT(a) DESC
        """)
    List<RecruiterHireCount> topRecruitersByHires();

    /** CVtheque (Module 5) — recherche PostgreSQL utilisee en repli quand
     *  Elasticsearch est indisponible (cf. CvSearchService). Cherche dans le nom
     *  du candidat, le titre de l'offre, et le texte extrait du CV. */
    @Query("""
        SELECT a FROM Application a
        JOIN a.candidate c
        JOIN a.offer o
        LEFT JOIN a.cvDocument cv
        WHERE LOWER(c.firstName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(o.title) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(cv.cvText) LIKE LOWER(CONCAT('%', :q, '%'))
        ORDER BY a.aiScore DESC NULLS LAST
        """)
    List<Application> searchCvtheque(@Param("q") String query, Pageable pageable);

    interface StageCount {
        String getStage();
        Long getTotal();
    }
    interface RecruiterHireCount {
        String getFirstName();
        String getLastName();
        Long getTotal();
    }
}
