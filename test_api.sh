#!/bin/bash

# API Test Script for TaskHub
# Make sure the server is running on port 5000 before executing

BASE_URL="http://localhost:5000"
API_KEY=""

# Arrays to store task IDs and tag names
TASK_IDS=()
TAG_NAMES=("urgent" "bug" "feature" "documentation")

echo "🚀 Testing TaskHub API Endpoints"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make curl requests and display results
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Request: $method $url"
    
    if [ -n "$data" ]; then
        echo "Data: $data"
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -H "x-api-key: $API_KEY" \
            -d "$data" \
            "$BASE_URL$url")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -H "x-api-key: $API_KEY" \
            "$BASE_URL$url")
    fi
    
    http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    body=$(echo "$response" | sed -e 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Success ($http_code)${NC}"
    else
        echo -e "${RED}❌ Failed ($http_code)${NC}"
    fi
    
    echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    echo "---"
}

# Test endpoint without API key
test_endpoint_no_auth() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Request: $method $url"
    
    if [ -n "$data" ]; then
        echo "Data: $data"
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$url")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            "$BASE_URL$url")
    fi
    
    http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    body=$(echo "$response" | sed -e 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Success ($http_code)${NC}"
    else
        echo -e "${RED}❌ Failed ($http_code)${NC}"
    fi
    
    echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    echo "---"
}

# 1. Test endpoint
test_endpoint_no_auth "GET" "/test" "" "Test endpoint"

# 2. Create workspace
echo -e "\n${YELLOW}Creating workspace...${NC}"
workspace_response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Workspace"}' \
    "$BASE_URL/workspaces")

workspace_http_code=$(echo "$workspace_response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
workspace_body=$(echo "$workspace_response" | sed -e 's/HTTP_CODE:[0-9]*$//')

echo "Workspace Response: $workspace_body" | jq . 2>/dev/null || echo "Workspace Response: $workspace_body"

if [ "$workspace_http_code" -ge 200 ] && [ "$workspace_http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ Workspace created successfully ($workspace_http_code)${NC}"
    # Extract workspace ID from response
    WORKSPACE_ID=$(echo "$workspace_body" | jq -r '.workspace.id // empty' 2>/dev/null)
    
    if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" = "null" ]; then
        echo -e "${YELLOW}⚠️  Could not extract workspace ID, using default ID: 1${NC}"
        WORKSPACE_ID=1
    fi
else
    echo -e "${RED}❌ Failed to create workspace ($workspace_http_code)${NC}"
    echo "Using default workspace ID: 1"
    WORKSPACE_ID=1
fi

echo -e "\n${YELLOW}Using Workspace ID: $WORKSPACE_ID${NC}"

# 3. Generate API key for workspace
echo -e "\n${YELLOW}Generating API key for workspace...${NC}"
api_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/apikeys")

echo "API Key Response: $api_response" | jq . 2>/dev/null || echo "API Key Response: $api_response"

# Extract API key from response
API_KEY=$(echo "$api_response" | jq -r '.apiKey // empty' 2>/dev/null)

if [ -z "$API_KEY" ] || [ "$API_KEY" = "null" ]; then
    echo -e "${RED}❌ Failed to extract API key from response${NC}"
    echo "Please check the response format and update the script accordingly."
    exit 1
fi

echo -e "\n${GREEN}✅ Extracted API Key: $API_KEY${NC}"

# 4. Get workspace stats
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/stats" "" "Get workspace stats"

# 5. Create 6 diverse tasks
echo -e "\n${YELLOW}Creating 6 diverse tasks...${NC}"

# Task data array: title, description, status, dueDate
declare -a TASKS=(
    "Setup project repository|Initialize git repository and basic project structure|todo|2025-11-01T00:00:00.000Z"
    "Implement user authentication|Add login and registration functionality|in_progress|2025-11-05T00:00:00.000Z"
    "Fix login bug|Resolve authentication timeout issue|todo|2025-10-30T00:00:00.000Z"
    "Write API documentation|Document all REST API endpoints|done|2025-11-10T00:00:00.000Z"
    "Add unit tests|Create comprehensive test suite|todo|2025-11-15T00:00:00.000Z"
    "Deploy to production|Set up production environment and deploy|in_progress|2025-11-20T00:00:00.000Z"
)

for i in "${!TASKS[@]}"; do
    IFS='|' read -r title description status dueDate <<< "${TASKS[$i]}"
    
    echo -e "\n${YELLOW}Creating task $((i+1)): $title${NC}"
    
    task_response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        -d "{
            \"title\": \"$title\",
            \"description\": \"$description\",
            \"status\": \"$status\",
            \"dueDate\": \"$dueDate\"
        }" \
        "$BASE_URL/workspaces/$WORKSPACE_ID/tasks")

    task_http_code=$(echo "$task_response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    task_body=$(echo "$task_response" | sed -e 's/HTTP_CODE:[0-9]*$//')

    echo "Task Response: $task_body" | jq . 2>/dev/null || echo "Task Response: $task_body"

    if [ "$task_http_code" -ge 200 ] && [ "$task_http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Task created successfully ($task_http_code)${NC}"
        # Extract task ID from response
        task_id=$(echo "$task_body" | jq -r '.task.id // empty' 2>/dev/null)
        
        if [ -n "$task_id" ] && [ "$task_id" != "null" ]; then
            TASK_IDS+=("$task_id")
            echo -e "${GREEN}Added task ID: $task_id${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not extract task ID${NC}"
            TASK_IDS+=("$((i+1))")  # fallback
        fi
    else
        echo -e "${RED}❌ Failed to create task ($task_http_code)${NC}"
        TASK_IDS+=("$((i+1))")  # fallback
    fi
done

echo -e "\n${YELLOW}Created Task IDs: ${TASK_IDS[*]}${NC}"
TASK_ID=${TASK_IDS[0]}  # Use first task ID for subsequent tests

# 6. Get all tasks
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks" "" "Get all tasks"

# 7. Get tasks with filters
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks?status=todo&limit=5" "" "Get tasks with status filter"

# 8. Search tasks
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks?q=test" "" "Search tasks"

# 9. Update task
test_endpoint "PATCH" "/workspaces/$WORKSPACE_ID/tasks/$TASK_ID" '{
    "title": "Updated Test Task",
    "status": "in_progress"
}' "Update task"

# 10. Create 4 tags
echo -e "\n${YELLOW}Creating 4 tags...${NC}"
for tag_name in "${TAG_NAMES[@]}"; do
    test_endpoint "PUT" "/workspaces/$WORKSPACE_ID/tags/$tag_name" "" "Upsert tag: $tag_name"
done

# 11. Attach tags to tasks
echo -e "\n${YELLOW}Attaching tags to tasks...${NC}"
# Attach urgent tag to first task
test_endpoint "POST" "/workspaces/$WORKSPACE_ID/tasks/${TASK_IDS[0]}/tags/urgent" "" "Attach urgent tag to task ${TASK_IDS[0]}"

# Attach bug tag to third task
test_endpoint "POST" "/workspaces/$WORKSPACE_ID/tasks/${TASK_IDS[2]}/tags/bug" "" "Attach bug tag to task ${TASK_IDS[2]}"

# Attach feature tag to second task
test_endpoint "POST" "/workspaces/$WORKSPACE_ID/tasks/${TASK_IDS[1]}/tags/feature" "" "Attach feature tag to task ${TASK_IDS[1]}"

# Attach documentation tag to fourth task
test_endpoint "POST" "/workspaces/$WORKSPACE_ID/tasks/${TASK_IDS[3]}/tags/documentation" "" "Attach documentation tag to task ${TASK_IDS[3]}"

# 12. Get tasks with tag filters
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks?tag=urgent" "" "Get tasks with urgent tag"
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks?tag=bug" "" "Get tasks with bug tag"
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks?tag=feature" "" "Get tasks with feature tag"

# 13. Get tasks with due date filter
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks?due_before=2025-11-02" "" "Get tasks due before date"

# 14. Test pagination with multiple tasks
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks?limit=3" "" "Test pagination (limit 3)"
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks?limit=2&status=todo" "" "Test pagination with status filter"

# 15. Delete task
test_endpoint "DELETE" "/workspaces/$WORKSPACE_ID/tasks/${TASK_IDS[0]}" "" "Delete task"

# 16. Verify task is deleted (should not appear in results)
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/tasks" "" "Verify task deletion"

# 17. Get final workspace stats after all operations
test_endpoint "GET" "/workspaces/$WORKSPACE_ID/stats" "" "Get final workspace stats"

echo -e "\n${GREEN}🎉 API Testing Complete!${NC}"
echo "================================"
echo "Note: The script automatically extracts workspace ID, task ID, and API key from responses."
echo "If extraction fails, it falls back to default values (ID: 1)."