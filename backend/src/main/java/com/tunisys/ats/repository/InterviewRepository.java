package com.tunisys.ats.repository;

import com.tunisys.ats.domain.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findByApplicationId(Long applicationId);

    Optional<Interview> findTopByApplicationIdAndInterviewTypeOrderByCreatedAtDesc(
            Long applicationId, String interviewType);
}
