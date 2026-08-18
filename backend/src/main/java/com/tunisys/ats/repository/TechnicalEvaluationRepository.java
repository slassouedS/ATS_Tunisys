package com.tunisys.ats.repository;
import com.tunisys.ats.domain.TechnicalEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface TechnicalEvaluationRepository extends JpaRepository<TechnicalEvaluation, Long> {
    Optional<TechnicalEvaluation> findByApplicationId(Long applicationId);
}
