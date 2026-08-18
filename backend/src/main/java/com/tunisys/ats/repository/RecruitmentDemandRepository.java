package com.tunisys.ats.repository;

import com.tunisys.ats.domain.RecruitmentDemand;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RecruitmentDemandRepository extends JpaRepository<RecruitmentDemand, Long> {
    List<RecruitmentDemand> findByStatus(String status);
    List<RecruitmentDemand> findByRequestedById(Long userId);
}
