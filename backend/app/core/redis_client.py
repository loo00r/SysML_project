import redis
import json
import uuid
from typing import Optional, Any
from app.core.config import settings


class RedisClient:
    """Redis client for diagram caching with TTL support"""
    
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    def store_diagram(self, diagram_data: dict) -> str:
        """
        Store diagram data in Redis with auto-generated ID and TTL
        
        Args:
            diagram_data: The diagram JSON data to store
            
        Returns:
            str: The generated diagram ID
        """
        diagram_id = str(uuid.uuid4())
        
        # Convert dict to JSON string
        json_data = json.dumps(diagram_data)
        
        # Store with TTL
        self.redis.setex(
            name=f"diagram:{diagram_id}",
            time=settings.REDIS_TTL,
            value=json_data
        )
        
        return diagram_id
    
    def get_diagram(self, diagram_id: str) -> Optional[dict]:
        """
        Retrieve diagram data from Redis by ID
        
        Args:
            diagram_id: The diagram ID to retrieve
            
        Returns:
            dict or None: The diagram data if found, None otherwise
        """
        try:
            json_data = self.redis.get(f"diagram:{diagram_id}")
            if json_data is None:
                return None
                
            return json.loads(json_data)
        except (redis.RedisError, json.JSONDecodeError) as e:
            print(f"Error retrieving diagram {diagram_id}: {e}")
            return None
    
    def delete_diagram(self, diagram_id: str) -> bool:
        """
        Delete diagram from Redis
        
        Args:
            diagram_id: The diagram ID to delete
            
        Returns:
            bool: True if deleted, False otherwise
        """
        try:
            result = self.redis.delete(f"diagram:{diagram_id}")
            return result > 0
        except redis.RedisError as e:
            print(f"Error deleting diagram {diagram_id}: {e}")
            return False
    
    def ping(self) -> bool:
        """
        Test Redis connection
        
        Returns:
            bool: True if connected, False otherwise
        """
        try:
            return self.redis.ping()
        except redis.RedisError:
            return False


# Global Redis client instance
redis_client = RedisClient()