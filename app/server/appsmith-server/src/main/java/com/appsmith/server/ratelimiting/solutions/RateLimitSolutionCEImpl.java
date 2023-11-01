package com.appsmith.server.ratelimiting.solutions;

import com.appsmith.caching.components.CacheManager;
import com.appsmith.server.constants.RateLimitConstants;
import com.appsmith.server.ratelimiting.configuration.ProxyManagerConfiguration;
import com.appsmith.server.ratelimiting.domains.RateLimit;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import io.github.bucket4j.TokensInheritanceStrategy;
import io.github.bucket4j.distributed.BucketProxy;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class RateLimitSolutionCEImpl implements RateLimitSolutionCE {
    private final Map<String, BucketConfiguration> apiConfigurationMap = new HashMap<>();
    private final Map<String, BucketProxy> apiBuckets = new HashMap<>();

    private final ProxyManagerConfiguration proxyManagerConfiguration;

    private final CacheManager cacheManager;

    public RateLimitSolutionCEImpl(ProxyManagerConfiguration proxyManagerConfiguration, CacheManager cacheManager) {
        this.proxyManagerConfiguration = proxyManagerConfiguration;
        this.cacheManager = cacheManager;
        init();
    }

    private void init() {
        initialiseApiConfigurationMap();
        initializeApiBuckets();
    }

    private void initialiseApiConfigurationMap() {
        apiConfigurationMap.put(
                RateLimitConstants.BUCKET_KEY_FOR_LOGIN_API,
                createBucketConfiguration(RateLimitConstants.DEFAULT_PRESET_RATE_LIMIT_LOGIN_API));
        apiConfigurationMap.put(
                RateLimitConstants.BUCKET_KEY_FOR_TEST_DATASOURCE_API,
                createBucketConfiguration(RateLimitConstants.DEFAULT_PRESET_RATE_LIMIT_TEST_DATASOURCE_API));
    }

    private void initializeApiBuckets() {
        apiConfigurationMap.forEach((apiIdentifier, configuration) ->
                apiBuckets.put(apiIdentifier, createBucketProxy(apiIdentifier, configuration)));
    }

    private BucketConfiguration createBucketConfiguration(Duration refillDuration, int limit) {
        Refill refillConfig = Refill.intervally(limit, refillDuration);
        Bandwidth limitConfig = Bandwidth.classic(limit, refillConfig);
        return BucketConfiguration.builder().addLimit(limitConfig).build();
    }

    private BucketConfiguration createBucketConfiguration(RateLimit rateLimit) {
        return createBucketConfiguration(rateLimit.getRefillDuration(), rateLimit.getLimit());
    }

    private BucketProxy createBucketProxy(String apiIdentifier, BucketConfiguration configuration) {
        return proxyManagerConfiguration
                .lettuceBasedProxyManager()
                .builder()
                .build(apiIdentifier.getBytes(), configuration);
    }

    @Override
    public Map<String, BucketProxy> getApiProxyBuckets() {
        return apiBuckets;
    }

    @Override
    public Mono<Long> updateApiProxyBucketForApiIdentifier(String apiIdentifier, RateLimit rateLimit) {
        BucketConfiguration newBucketConfiguration =
                createBucketConfiguration(rateLimit.getRefillDuration(), rateLimit.getLimit());
        apiConfigurationMap.put(apiIdentifier, newBucketConfiguration);
        return cacheManager.getKeysWithPrefix(apiIdentifier).map(existingKeys -> {
            existingKeys.forEach(key -> {
                System.out.println("Login Api Bucket Key " + key);
                proxyManagerConfiguration
                        .lettuceBasedProxyManager()
                        .getProxyConfiguration(key.getBytes())
                        .ifPresent(existingConfiguration -> {
                            BucketProxy existingBucketProxy = proxyManagerConfiguration
                                    .lettuceBasedProxyManager()
                                    .builder()
                                    .build(key.getBytes(), existingConfiguration);
                            System.out.println("Tokens for : " + key + " " + existingBucketProxy.getAvailableTokens());
                            existingBucketProxy.replaceConfiguration(
                                    newBucketConfiguration, TokensInheritanceStrategy.RESET);
                            System.out.println("Tokens for : " + key + " " + existingBucketProxy.getAvailableTokens());
                        });
            });
            return 1L;
        });
    }

    @Override
    public BucketProxy getOrCreateAPIUserSpecificBucket(String apiIdentifier, String userId) {
        String bucketIdentifier = apiIdentifier + userId;
        Optional<BucketConfiguration> bucketProxy =
                proxyManagerConfiguration.lettuceBasedProxyManager().getProxyConfiguration(bucketIdentifier.getBytes());
        if (bucketProxy.isPresent()) {
            return proxyManagerConfiguration
                    .lettuceBasedProxyManager()
                    .builder()
                    .build(bucketIdentifier.getBytes(), bucketProxy.get());
        }

        return proxyManagerConfiguration
                .lettuceBasedProxyManager()
                .builder()
                .build(bucketIdentifier.getBytes(), apiConfigurationMap.get(apiIdentifier));
    }
}
