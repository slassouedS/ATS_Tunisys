package com.tunisys.ats.repository;

import com.tunisys.ats.domain.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
    List<Assessment> findByApplicationId(Long applicationId);
}
