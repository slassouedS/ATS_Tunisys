package com.tunisys.ats.repository;

import com.tunisys.ats.domain.ApplicationStageHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApplicationStageHistoryRepository extends JpaRepository<ApplicationStageHistory, Long> {
    List<ApplicationStageHistory> findByApplicationIdOrderByChangedAtDesc(Long applicationId);
}
