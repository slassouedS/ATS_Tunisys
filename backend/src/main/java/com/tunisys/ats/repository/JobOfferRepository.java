package com.tunisys.ats.repository;

import com.tunisys.ats.domain.JobOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface JobOfferRepository extends JpaRepository<JobOffer, Long> {
    List<JobOffer> findByStatus(String status);

    @Query("SELECT o.status AS status, COUNT(o) AS total FROM JobOffer o GROUP BY o.status")
    List<StatusCount> countByStatus();

    interface StatusCount {
        String getStatus();
        Long getTotal();
    }
}
